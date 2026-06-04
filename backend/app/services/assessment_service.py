from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from loguru import logger
from fastapi import HTTPException, status

from app.repositories.assessment_repo import assessment_repo
from app.repositories.question_repo import question_repo
from app.repositories.assessment_result_repo import assessment_result_repo
from app.repositories.assessment_attempt_repo import assessment_attempt_repo
from app.repositories.concept_mastery_repo import concept_mastery_repo
from app.repositories.coding_submission_repo import coding_submission_repo
from app.repositories.history_repo import history_repo
from app.repositories.ai_job_repo import ai_job_repo
from app.repositories.asset_repo import asset_repo

from app.services.streak_service import StreakService
from app.services.xp_service import XPService
from app.services.achievement_service import AchievementService
from app.services.question_generation_service import QuestionGenerationService

class AssessmentService:
    @staticmethod
    async def create_assessment_job(
        user_id: str,
        asset_id: str,
        options: Dict[str, Any]
    ) -> str:
        # Validate asset ownership
        asset = await asset_repo.get_by_id(asset_id)
        if not asset or asset.get("status") == "deleted":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        if asset.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        # Create background AI job in DB
        job_id = str(ObjectId())
        doc = {
            "_id": job_id,
            "user_id": user_id,
            "asset_id": asset_id,
            "job_type": "assessment",
            "generation_mode": options.get("generation_mode", "Exam Preparation"),
            "status": "pending",
            "progress": 0,
            "current_step": "upload",
            "result_id": None,
            "options": options,
            "created_at": datetime.now(timezone.utc),
            "completed_at": None
        }
        await ai_job_repo.collection.insert_one(doc)
        return job_id

    @staticmethod
    async def process_assessment_job(job_id: str):
        job = await ai_job_repo.get_job(job_id)
        if not job:
            logger.error(f"Assessment generation job {job_id} not found.")
            return

        user_id = job["user_id"]
        asset_id = job["asset_id"]
        options = job.get("options", {})
        
        question_count = options.get("question_count", 10)
        question_types = options.get("question_types", ["mcq"])
        difficulty = options.get("difficulty", "medium")
        mode = job.get("generation_mode", "Exam Preparation")

        try:
            logger.info(f"Processing assessment job {job_id}. Step: extracting...")
            await ai_job_repo.update_status(job_id, "processing", progress=20, current_step="extracting")
            
            # Fetch asset info
            asset = await asset_repo.get_by_id(asset_id)
            if not asset:
                raise Exception("Asset not found.")

            # Step 2: Generating questions
            logger.info(f"Job {job_id}. Step: generating...")
            await ai_job_repo.update_status(job_id, "processing", progress=50, current_step="generating")
            
            assessment_id = str(ObjectId())
            
            # Retrieve user language preference
            from app.repositories.user_repo import user_repo
            user = await user_repo.get_by_id(user_id)
            language = user.get("preferred_language", "Python") if user else "Python"

            questions = await QuestionGenerationService.generate_questions(
                user_id=user_id,
                asset_id=asset_id,
                assessment_id=assessment_id,
                question_count=question_count,
                question_types=question_types,
                difficulty=difficulty,
                generation_mode=mode,
                preferred_language=language
            )

            # Step 3: Saving
            logger.info(f"Job {job_id}. Step: saving...")
            await ai_job_repo.update_status(job_id, "processing", progress=85, current_step="saving")

            # Save generated assessment metadata
            title = options.get("title") or f"Assessment: {asset.get('title', 'Study Material')}"
            est_duration = max(5, int(question_count * 1.5)) # estimate 1.5 min per question

            assessment_doc = {
                "_id": assessment_id,
                "user_id": user_id,
                "asset_id": asset_id,
                "title": title,
                "difficulty": difficulty,
                "question_count": len(questions),
                "question_types": question_types,
                "estimated_duration": est_duration,
                "template_name": options.get("template_name"),
                "created_at": datetime.now(timezone.utc)
            }
            await assessment_repo.create_assessment(assessment_doc)

            # Save questions
            await question_repo.insert_questions(questions)

            logger.info(f"Assessment job {job_id} successfully finalized.")
            await ai_job_repo.update_status(job_id, "completed", result_id=assessment_id, progress=100, current_step="completed")

        except Exception as e:
            logger.error(f"Assessment job {job_id} failed: {e}")
            await ai_job_repo.update_status(job_id, "failed", progress=100, current_step="failed")

    @staticmethod
    async def get_assessments_dashboard(user_id: str) -> List[Dict[str, Any]]:
        assessments = await assessment_repo.get_by_user(user_id)
        enriched = []
        
        for a in assessments:
            assessment_id = a["_id"]
            
            # Fetch asset title
            asset = await asset_repo.get_by_id(a["asset_id"])
            asset_title = asset.get("title", "Deleted Material") if asset else "Deleted Material"
            
            # Fetch attempts count, best score, latest attempt
            attempts_count = await assessment_attempt_repo.get_count_for_assessment(user_id, assessment_id)
            best_res = await assessment_result_repo.get_best_for_assessment(user_id, assessment_id)
            latest_res = await assessment_result_repo.get_latest_for_assessment(user_id, assessment_id)
            
            enriched.append({
                **a,
                "asset_title": asset_title,
                "total_attempts": attempts_count,
                "best_score": best_res.get("score") if best_res else None,
                "best_accuracy": best_res.get("accuracy") if best_res else None,
                "latest_score": latest_res.get("score") if latest_res else None,
                "latest_accuracy": latest_res.get("accuracy") if latest_res else None,
                "last_attempt_at": latest_res.get("created_at") if latest_res else None
            })
        return enriched

    @staticmethod
    async def get_assessment_details(assessment_id: str, user_id: str) -> Dict[str, Any]:
        assessment = await assessment_repo.get_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        if assessment.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
        questions = await question_repo.get_by_assessment(assessment_id)
        
        # Pull latest coding submissions drafts if any to prefill editor
        sanitized_questions = []
        for q in questions:
            q_copy = dict(q)
            if q["question_type"] == "coding":
                sub = await coding_submission_repo.get_by_user_and_question(user_id, q["_id"])
                q_copy["draft_solution"] = sub.get("solution") if sub else ""
                q_copy["draft_language"] = sub.get("language") if sub else ""
            sanitized_questions.append(q_copy)
            
        return {
            "assessment": assessment,
            "questions": sanitized_questions
        }

    @staticmethod
    async def submit_answers(
        assessment_id: str,
        user_id: str,
        user_answers: Dict[str, Any], # question_id -> response (option string, blank text, notes dict, or code text)
        duration_ms: int
    ) -> Dict[str, Any]:
        assessment = await assessment_repo.get_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        if assessment.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        questions = await question_repo.get_by_assessment(assessment_id)
        if not questions:
            raise HTTPException(status_code=400, detail="Question bank is empty")

        score = 0
        total = len(questions)
        weak_topics = []
        strong_topics = []
        
        graded_details = []
        has_coding = False
        has_interview = False

        for q in questions:
            q_id = q["_id"]
            q_type = q["question_type"]
            concepts = q.get("concept_tags", ["General"])
            
            student_ans = user_answers.get(q_id, "")
            is_correct = False
            
            # Option rating or interview prep mode notes (Addition 6)
            self_rating = None
            notes = None
            
            # Grade question types
            if q_type == "mcq" or q_type == "true_false":
                is_correct = (str(student_ans).strip().lower() == str(q.get("correct_answer", "")).strip().lower())
                
            elif q_type == "fill_blank":
                # Normalize spaces and casing for blanks
                is_correct = (str(student_ans).strip().lower() == str(q.get("correct_answer", "")).strip().lower())
                
            elif q_type == "scenario":
                # Marked correct if they supplied a meaningful answer
                is_correct = (len(str(student_ans).strip()) > 3)
                
            elif q_type == "interview":
                has_interview = True
                # Interview prep qa uses notes & self-rating (Addition 6)
                if isinstance(student_ans, dict):
                    notes = student_ans.get("notes")
                    self_rating = student_ans.get("rating")
                    # Save self-rating and notes feedback in coding_submissions/feedback logs?
                    # We can store notes and ratings inside the attempt details
                    # If rating is >= 3, count as correct
                    is_correct = (self_rating is not None and int(self_rating) >= 3)
                else:
                    is_correct = (len(str(student_ans).strip()) > 3)
                    
            elif q_type == "coding":
                has_coding = True
                # Coding solution is submitted. Grade as correct if code is drafted
                # Save draft solution (Step 17)
                code_text = ""
                lang = "Python"
                if isinstance(student_ans, dict):
                    code_text = student_ans.get("solution", "")
                    lang = student_ans.get("language", "Python")
                else:
                    code_text = str(student_ans)
                
                if code_text:
                    await coding_submission_repo.save_submission(user_id, q_id, lang, code_text)
                    is_correct = True
                else:
                    is_correct = False
            
            # Score accumulation
            if is_correct:
                score += 1
                strong_topics.extend(concepts)
                # Mastery delta (Addition 4)
                for c in concepts:
                    await concept_mastery_repo.update_mastery(user_id, c, 0.1)
            else:
                weak_topics.extend(concepts)
                for c in concepts:
                    await concept_mastery_repo.update_mastery(user_id, c, -0.1)

            graded_details.append({
                "question_id": q_id,
                "question_type": q_type,
                "is_correct": is_correct,
                "correct_answer": q.get("correct_answer"),
                "explanation": q.get("explanation"),
                "concept_tags": concepts,
                "self_rating": self_rating,
                "notes": notes
            })

        # Calculations
        accuracy = (score / total) * 100 if total > 0 else 0
        weak_topics = list(set(weak_topics))
        strong_topics = list(set(strong_topics))
        
        # Exclude strong topics from weak list
        weak_topics = [t for t in weak_topics if t not in strong_topics]
        if not weak_topics:
            weak_topics = ["General Concepts"] if accuracy < 100 else []

        # AI Insights generator (Addition 8)
        next_rec_topic = weak_topics[0] if weak_topics else (strong_topics[0] if strong_topics else "Advanced Topics")
        
        # Save result document
        result_id = str(ObjectId())
        result_doc = {
            "_id": result_id,
            "user_id": user_id,
            "assessment_id": assessment_id,
            "score": score,
            "accuracy": accuracy,
            "duration_ms": duration_ms,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "next_recommended_assessment_topic": next_rec_topic,
            "created_at": datetime.now(timezone.utc)
        }
        await assessment_result_repo.create_result(result_doc)

        # Log retake attempt (Addition 3)
        attempt_num = (await assessment_attempt_repo.get_count_for_assessment(user_id, assessment_id)) + 1
        attempt_doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "assessment_id": assessment_id,
            "attempt_number": attempt_num,
            "score": score,
            "accuracy": accuracy,
            "duration_ms": duration_ms,
            "created_at": datetime.now(timezone.utc)
        }
        await assessment_attempt_repo.create_attempt(attempt_doc)

        # Gamification: Update streaks
        await StreakService.update_streak(user_id)

        # Gamification: Award XP
        xp_earned = score * 10
        if accuracy == 100.0:
            xp_earned += 50 # perfect score bonus
        if xp_earned > 0:
            await XPService.award_xp(user_id, xp_earned, f"Assessment Completed (Attempt #{attempt_num})", assessment_id)

        # Gamification: Achievements Check
        await AchievementService.check_and_unlock(user_id, "first_ai_assessment")
        if accuracy == 100.0:
            await AchievementService.check_and_unlock(user_id, "perfect_score") # Existing
            await AchievementService.check_and_unlock(user_id, "perfect_ai_assessment") # New
        if has_coding:
            await AchievementService.check_and_unlock(user_id, "coding_master")
        if has_interview:
            await AchievementService.check_and_unlock(user_id, "interview_expert")

        # Activity log entry
        await history_repo.add_history_entry(
            user_id=user_id,
            action=f"Completed Assessment: {assessment.get('title')}",
            details={
                "score": f"{score}/{total}",
                "accuracy": accuracy,
                "attempt_number": attempt_num,
                "assessment_id": assessment_id
            }
        )

        return {
            "result_id": result_id,
            "score": score,
            "total_questions": total,
            "accuracy": accuracy,
            "duration_ms": duration_ms,
            "attempt_number": attempt_num,
            "graded_details": graded_details,
            "insights": {
                "strengths": strong_topics,
                "weak_areas": weak_topics,
                "recommended_next_topic": next_rec_topic
            }
        }
