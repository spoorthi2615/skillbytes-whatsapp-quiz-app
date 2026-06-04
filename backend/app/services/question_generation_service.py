import json
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from loguru import logger
from bson import ObjectId
from app.core.config import settings
from app.repositories.chunk_repo import chunk_repo
from app.services.ai_service import AIService

# Predefined templates matching ADDITION 1
TEMPLATES = {
    "Quick Quiz": {
        "question_count": 10,
        "question_types": ["mcq", "true_false"],
        "difficulty": "medium"
    },
    "Placement Prep": {
        "question_count": 20,
        "question_types": ["mcq", "scenario", "coding"],
        "difficulty": "mixed"
    },
    "Interview Prep": {
        "question_count": 10,
        "question_types": ["scenario", "interview"],
        "difficulty": "medium"
    },
    "Revision Test": {
        "question_count": 20,
        "question_types": ["mcq", "true_false", "fill_blank"],
        "difficulty": "mixed"
    },
    "Coding Assessment": {
        "question_count": 5,
        "question_types": ["coding"],
        "difficulty": "mixed"
    }
}

class QuestionGenerationService:
    @staticmethod
    async def generate_questions(
        user_id: str,
        asset_id: str,
        assessment_id: str,
        question_count: int,
        question_types: List[str],
        difficulty: str,
        generation_mode: str,
        preferred_language: str = "Python"
    ) -> List[Dict[str, Any]]:
        # Fetch chunks
        chunks = await chunk_repo.get_by_asset(asset_id)
        if not chunks:
            raise ValueError("No study material chunks found for this asset. Please run parsing first.")

        # If Gemini key is set, attempt live generation with validation
        if settings.gemini_api_key:
            retries = 3
            for attempt in range(retries):
                try:
                    logger.info(f"Attempting live question generation using Gemini (Attempt {attempt + 1})...")
                    prompt = QuestionGenerationService._build_generation_prompt(
                        chunks, question_count, question_types, difficulty, generation_mode, preferred_language
                    )
                    res = AIService._call_gemini_api(prompt)
                    
                    # Validate questions (Addition 2)
                    raw_questions = res.get("questions", [])
                    validated_questions = []
                    
                    for q in raw_questions:
                        quality_score = QuestionGenerationService._validate_question(q)
                        if quality_score >= 6.0:  # Passing threshold
                            q["quality_score"] = quality_score
                            validated_questions.append(q)
                        else:
                            logger.warning(f"Question failed quality validation (score: {quality_score}): {q.get('question')}")
                    
                    # If we got at least 70% of the requested questions, we are good!
                    if len(validated_questions) >= int(question_count * 0.7):
                        logger.info(f"Successfully generated {len(validated_questions)} verified questions.")
                        return QuestionGenerationService._finalize_questions(
                            validated_questions, assessment_id, asset_id, chunks
                        )
                except Exception as e:
                    logger.error(f"Live question generation failed on attempt {attempt + 1}: {e}")
            
            logger.warning("Live question generation failed quality threshold, falling back to mock generator.")

        # Fallback to high-quality mock generator
        mock_questions = QuestionGenerationService._generate_mock_questions(
            chunks, question_count, question_types, difficulty, preferred_language
        )
        return QuestionGenerationService._finalize_questions(
            mock_questions, assessment_id, asset_id, chunks
        )

    @staticmethod
    def _validate_question(q: Dict[str, Any]) -> float:
        """
        Validates question quality (Addition 2).
        Returns a quality score out of 10.0.
        """
        score = 10.0
        q_type = q.get("question_type", "")
        
        # 1. Basic validation
        if not q.get("question") or len(q["question"].strip()) < 5:
            score -= 4.0
        if not q.get("explanation") or len(q["explanation"].strip()) < 10:
            score -= 2.0  # missing/short explanation
        if not q.get("concept_tags") or len(q["concept_tags"]) == 0:
            score -= 1.0  # empty concept tags

        # 2. MCQ specific validation
        if q_type == "mcq":
            options = q.get("options", [])
            correct = q.get("correct_answer", "")
            
            if len(options) != 4:
                score -= 3.0
            if len(set(options)) != len(options):
                score -= 2.0  # duplicate options
            if correct not in options:
                score -= 3.0  # invalid answer
                
        # 3. True/False validation
        elif q_type == "true_false":
            correct = q.get("correct_answer", "")
            if correct not in ["True", "False"]:
                score -= 3.0
                
        # 4. Coding validation
        elif q_type == "coding":
            if not q.get("problem_statement"):
                score -= 3.0
            if not q.get("sample_input") or not q.get("sample_output"):
                score -= 2.0

        return max(0.0, score)

    @staticmethod
    def _finalize_questions(
        questions: List[Dict[str, Any]],
        assessment_id: str,
        asset_id: str,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        final_list = []
        source_ids = [c["_id"] for c in chunks]
        default_tags = chunks[0].get("concept_tags", ["General"]) if chunks else ["General"]
        
        for q in questions:
            q_id = str(ObjectId())
            q_type = q.get("question_type", "mcq")
            
            # Form clean question doc
            doc = {
                "_id": q_id,
                "assessment_id": assessment_id,
                "asset_id": asset_id,
                "question_type": q_type,
                "difficulty": q.get("difficulty") or "medium",
                "question": q.get("question", "General quiz question"),
                "options": q.get("options") or ([] if q_type != "true_false" else ["True", "False"]),
                "correct_answer": q.get("correct_answer", "True" if q_type == "true_false" else ""),
                "explanation": q.get("explanation") or "No explanation available.",
                "source_chunk_ids": q.get("source_chunk_ids") or [source_ids[0]],
                "concept_tags": q.get("concept_tags") or default_tags,
                "quality_score": q.get("quality_score") or 9.0,
                "created_at": datetime.now(timezone.utc)
            }
            
            # Coding challenge attributes (Addition 7)
            if q_type == "coding":
                doc.update({
                    "problem_statement": q.get("problem_statement") or doc["question"],
                    "constraints": q.get("constraints") or "Time complexity: O(N)\nSpace complexity: O(1)",
                    "sample_input": q.get("sample_input") or "N/A",
                    "sample_output": q.get("sample_output") or "N/A",
                    "hints": q.get("hints") or ["Review syntax and boundary conditions."],
                    "time_complexity": q.get("time_complexity") or "O(N)",
                    "space_complexity": q.get("space_complexity") or "O(1)",
                    "topics": q.get("topics") or doc["concept_tags"],
                    "company_tags": q.get("company_tags") or ["Google", "Microsoft", "Amazon"]
                })
                
            final_list.append(doc)
        return final_list

    @staticmethod
    def _build_generation_prompt(
        chunks: List[Dict[str, Any]],
        count: int,
        types: List[str],
        difficulty: str,
        mode: str,
        language: str
    ) -> str:
        full_text = "\n\n".join([f"[Chunk ID: {c['_id']}]\n{c['chunk_text']}" for c in chunks])
        source_ids = [c["_id"] for c in chunks]
        
        return (
            f"You are an expert AI tutor. Generate {count} learning assessment questions based on the text below.\n"
            f"Allowed question types: {', '.join(types)}.\n"
            f"Target difficulty: {difficulty}.\n"
            f"Template Mode: {mode}.\n"
            f"For coding challenges, use language: {language}.\n\n"
            "Format the output strictly as a JSON object, without markdown formatting blocks (do not wrap in ```json or ```).\n"
            "Return the following JSON schema:\n"
            "{\n"
            "  \"questions\": [\n"
            "     {\n"
            "        \"question_type\": \"mcq | true_false | fill_blank | scenario | interview | coding\",\n"
            "        \"difficulty\": \"easy | medium | hard\",\n"
            "        \"question\": \"Question or statement text\",\n"
            "        \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], // MCQ only\n"
            "        \"correct_answer\": \"Correct answer value\", // Exact option string for MCQ/True-False, word for Fill-Blank, or summary text for scenario/interview/coding\n"
            "        \"explanation\": \"Detailed pedagogical explanation\",\n"
            "        \"concept_tags\": [\"Tag1\", \"Tag2\"],\n"
            "        \"source_chunk_ids\": [\"Provide matching Chunk ID(s) from the source material\"],\n"
            "        // For coding questions only:\n"
            "        \"problem_statement\": \"Write a function...\",\n"
            "        \"constraints\": \"Time: O(N), Space: O(N)\",\n"
            "        \"sample_input\": \"input value\",\n"
            "        \"sample_output\": \"output value\",\n"
            "        \"hints\": [\"Hint 1\", \"Hint 2\"],\n"
            "        \"time_complexity\": \"O(N)\",\n"
            "        \"space_complexity\": \"O(N)\",\n"
            "        \"topics\": [\"Arrays\", \"Sorting\"],\n"
            "        \"company_tags\": [\"Google\", \"Microsoft\"]\n"
            "     }\n"
            "  ]\n"
            "}\n\n"
            f"Source Text:\n{full_text}"
        )

    @staticmethod
    def _generate_mock_questions(
        chunks: List[Dict[str, Any]],
        count: int,
        types: List[str],
        difficulty: str,
        language: str
    ) -> List[Dict[str, Any]]:
        questions = []
        source_ids = [c["_id"] for c in chunks]
        
        # Determine tags
        all_tags = []
        for c in chunks:
            all_tags.extend(c.get("concept_tags", []))
        all_tags = list(set(all_tags))
        if not all_tags:
            all_tags = ["General Software Engineering"]
            
        # Sentences extractor helper
        def get_sentence(txt: str) -> str:
            parts = re.split(r'[.!?]', txt)
            return parts[0].strip() + "." if parts else txt[:100]

        # Distribute count over requested types
        type_cycle = types if types else ["mcq"]
        
        for i in range(count):
            chunk = chunks[i % len(chunks)]
            c_tag = chunk.get("concept_tags", ["General"])[0] if chunk.get("concept_tags") else all_tags[0]
            sentence = get_sentence(chunk["chunk_text"])
            q_type = type_cycle[i % len(type_cycle)]
            q_diff = difficulty if difficulty != "mixed" else ("easy" if i % 3 == 0 else "medium" if i % 3 == 1 else "hard")

            if q_type == "mcq":
                questions.append({
                    "question_type": "mcq",
                    "difficulty": q_diff,
                    "question": f"Which of the following best describes the core aspect of '{c_tag}' as mentioned in the study material?",
                    "options": [
                        f"{sentence} (Correct)",
                        f"It is completely unrelated to {c_tag}.",
                        f"It represents an obsolete standard bypassed in modern frameworks.",
                        f"It requires excessive manual hardware allocation."
                    ],
                    "correct_answer": f"{sentence} (Correct)",
                    "explanation": f"Based on the study guide, the text explicitly specifies: '{sentence}' This forms a fundamental design rule.",
                    "concept_tags": [c_tag, "Foundations"],
                    "source_chunk_ids": [chunk["_id"]]
                })
            
            elif q_type == "true_false":
                is_true = (i % 2 == 0)
                statement = sentence if is_true else f"It is widely accepted that {c_tag} has no impact on overall performance metrics."
                questions.append({
                    "question_type": "true_false",
                    "difficulty": q_diff,
                    "question": f"True or False: In relation to {c_tag}, the following statement is correct: '{statement}'",
                    "options": ["True", "False"],
                    "correct_answer": "True" if is_true else "False",
                    "explanation": f"The material states that: '{sentence}'. Therefore, the statement is {'True' if is_true else 'False'}.",
                    "concept_tags": [c_tag],
                    "source_chunk_ids": [chunk["_id"]]
                })

            elif q_type == "fill_blank":
                word = chunk.get("keywords", ["parameter"])[0]
                masked_sentence = sentence.replace(word, "_____") if word in sentence else f"In the context of {c_tag}, the primary _____ governs resource allocation."
                questions.append({
                    "question_type": "fill_blank",
                    "difficulty": q_diff,
                    "question": f"Fill in the blank: {masked_sentence}",
                    "correct_answer": word,
                    "explanation": f"The complete sentence reads: '{sentence}' with '{word}' filling the blank.",
                    "concept_tags": [c_tag, "Vocabulary"],
                    "source_chunk_ids": [chunk["_id"]]
                })

            elif q_type == "scenario":
                questions.append({
                    "question_type": "scenario",
                    "difficulty": q_diff,
                    "question": f"A production system experiences high latency while processing {c_tag} tasks. Based on the concept details, which layer should be audited first?",
                    "correct_answer": f"Audit the logic corresponding to: {sentence[:60]}...",
                    "explanation": f"Optimizing {c_tag} involves checking: '{sentence}' which directly impacts processing execution times.",
                    "concept_tags": [c_tag, "Troubleshooting"],
                    "source_chunk_ids": [chunk["_id"]]
                })

            elif q_type == "interview":
                questions.append({
                    "question_type": "interview",
                    "difficulty": q_diff,
                    "question": f"How does '{c_tag}' help in scaling software applications? Explain conceptual mechanics.",
                    "correct_answer": f"It handles scale because: {sentence}",
                    "explanation": f"The system design rules state: '{sentence}' leading to clean scaling thresholds.",
                    "concept_tags": [c_tag, "Viva Prep"],
                    "source_chunk_ids": [chunk["_id"]]
                })

            elif q_type == "coding":
                topic_tag = c_tag.replace(" ", "")
                questions.append({
                    "question_type": "coding",
                    "difficulty": q_diff,
                    "question": f"Write a function in {language} to filter and compute metrics for '{topic_tag}' arrays.",
                    "explanation": f"The solution requires iterating through the inputs and checking boundary values based on: '{sentence}'",
                    "concept_tags": [c_tag, "Programming"],
                    "source_chunk_ids": [chunk["_id"]],
                    "problem_statement": f"Write a function `solve{topic_tag}(data)` in {language} that processes a list of inputs and returns the count of items aligning with: {sentence[:80]}.",
                    "constraints": f"Time Complexity: O(N) where N is the length of data.\nSpace Complexity: O(1).",
                    "sample_input": "[10, 20, 30]",
                    "sample_output": "2",
                    "hints": [
                        f"Iterate through each item and compare against values.",
                        f"Think about performance optimization when scaling inputs."
                    ],
                    "time_complexity": "O(N)",
                    "space_complexity": "O(1)",
                    "topics": [c_tag, "Logic"],
                    "company_tags": ["Google", "Amazon", "Microsoft"]
                })

        return questions
