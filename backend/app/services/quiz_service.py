from datetime import datetime, timezone
from bson import ObjectId
from app.repositories.quiz_repo import session_repo, event_repo, question_repo, user_repo
from app.schemas.domain import StartQuizRequest, AnswerRequest

class QuizService:
    @staticmethod
    async def start_quiz(request: StartQuizRequest):
        # Create user if not exists or update last_active
        user = await user_repo.get_by_id(request.user_id)
        now = datetime.now(timezone.utc)
        if not user:
            await user_repo.create({"_id": request.user_id, "created_at": now, "last_active_at": now})
        else:
            await user_repo.update(request.user_id, {"last_active_at": now})

        # Use the question count from the frontend (the actual sampled subset)
        # This prevents a mismatch between the randomized 5-question session
        # and the full chapter count (which could be 8-12)
        total_questions = request.total_questions

        session_id = str(ObjectId())
        session_data = {
            "_id": session_id,
            "user_id": request.user_id,
            "chapter_id": request.chapter_id,
            "current_question_index": 0,
            "answers": {},
            "started_at": now,
            "completed_at": None,
            "score": 0,
            "total_questions": total_questions,
            "accuracy_percentage": 0.0
        }
        await session_repo.create(session_data)

        return {"session_id": session_id, "total_questions": total_questions}

    @staticmethod
    async def submit_answer(session_id: str, request: AnswerRequest):
        session = await session_repo.get_by_id(session_id)
        if not session:
            raise ValueError("Session not found")

        question = await question_repo.get_by_id(request.question_id)
        if not question:
            raise ValueError("Question not found")

        is_correct = (question.get("correct_option_id") == request.selected_option_id)
        now = datetime.now(timezone.utc)

        # Update session
        answers = session.get("answers", {})
        answers[request.question_id] = request.selected_option_id
        
        score = session.get("score", 0)
        if is_correct:
            score += 1
            
        current_index = session.get("current_question_index", 0) + 1
        
        update_data = {
            "answers": answers,
            "score": score,
            "current_question_index": current_index
        }
        await session_repo.update(session_id, update_data)

        # Update event
        await event_repo.create({
            "_id": str(ObjectId()),
            "session_id": session_id,
            "user_id": session["user_id"],
            "question_id": request.question_id,
            "event_type": "question_answered",
            "shown_at": now, # Simplified
            "answered_at": now,
            "duration_ms": request.duration_ms,
            "selected_option_id": request.selected_option_id,
            "is_correct": is_correct
        })

        return {"is_correct": is_correct, "explanation": question.get("explanation"), "correct_option_id": question.get("correct_option_id")}

    @staticmethod
    async def complete_quiz(session_id: str):
        session = await session_repo.get_by_id(session_id)
        if not session:
            raise ValueError("Session not found")

        score = session.get("score", 0)
        total = session.get("total_questions", 1)
        accuracy = (score / total) * 100 if total > 0 else 0

        completed_at = datetime.now(timezone.utc)
        started_at = session.get("started_at", completed_at)
        # Ensure they are timezone aware
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
            
        time_spent_ms = int((completed_at - started_at).total_seconds() * 1000)

        update_data = {
            "completed_at": completed_at,
            "accuracy_percentage": accuracy
        }
        await session_repo.update(session_id, update_data)

        # Calculate average response time
        events = await event_repo.get_all({"session_id": session_id, "event_type": "question_answered"})
        total_duration = sum(e.get("duration_ms", 0) for e in events if e.get("duration_ms"))
        avg_response_time = (total_duration / len(events)) if events else 0

        return {
            "score": score,
            "total_questions": total,
            "accuracy_percentage": accuracy,
            "correct_answers": score,
            "incorrect_answers": total - score,
            "time_spent_ms": time_spent_ms,
            "average_response_time_ms": avg_response_time,
            "weakest_topic": "System Design" if accuracy < 70 else None,
            "strongest_topic": "System Design" if accuracy >= 70 else None
        }
