import json
import urllib.request
import urllib.error
from typing import Dict, Any, List
import re
from app.core.config import settings
from loguru import logger

class AIService:
    @staticmethod
    def _call_gemini_api(prompt: str) -> Dict[str, Any]:
        """Calls the Gemini 1.5 Flash REST API synchronously using urllib."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                # Extract text response from Gemini response payload
                candidates = res_body.get("candidates", [])
                if not candidates:
                    raise Exception("No response candidates returned by Gemini.")
                text_content = candidates[0]["content"]["parts"][0]["text"]
                return json.loads(text_content.strip())
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            logger.error(f"Gemini API returned error code {e.code}: {err_msg}")
            raise Exception(f"Gemini API failed: {err_msg}")
        except Exception as e:
            logger.error(f"Gemini API call exception: {e}")
            raise e

    @classmethod
    def generate_content(cls, chunks: List[Dict[str, Any]], content_type: str, mode: str, asset_title: str) -> Dict[str, Any]:
        """
        Generates summary, revision notes, or flashcards from content chunks.
        Falls back to local rule-based generation if no Gemini key is set.
        """
        # Combine text for context
        full_text = "\n\n".join([f"[Chunk ID: {c['_id']}]\n{c['chunk_text']}" for c in chunks])
        source_ids = [c["_id"] for c in chunks]
        
        if settings.gemini_api_key:
            try:
                prompt = cls._build_prompt(full_text, content_type, mode, asset_title)
                logger.info(f"Invoking Gemini API for {content_type} ({mode})...")
                res = cls._call_gemini_api(prompt)
                
                # Verify schema matches expectations, adding citations if missing
                if content_type == "summary":
                    return {
                        "short_summary": res.get("short_summary", "Summary not available."),
                        "detailed_summary": res.get("detailed_summary", "Detailed summary not available."),
                        "key_concepts": [
                            {
                                "concept": c.get("concept", "Concept"),
                                "explanation": c.get("explanation", "Explanation"),
                                "source_chunk_id": c.get("source_chunk_id") or source_ids[0]
                            }
                            for c in res.get("key_concepts", [])
                        ]
                    }
                elif content_type == "revision_notes":
                    return {
                        "exam_notes": res.get("exam_notes", "Notes not available."),
                        "quick_notes": res.get("quick_notes", "Quick notes not available."),
                        "important_topics": [
                            {
                                "topic": t.get("topic", "Topic"),
                                "notes": t.get("notes", "Notes"),
                                "source_chunk_id": t.get("source_chunk_id") or source_ids[0]
                            }
                            for t in res.get("important_topics", [])
                        ]
                    }
                elif content_type == "flashcards":
                    return {
                        "cards": [
                            {
                                "question": card.get("question", "Question?"),
                                "answer": card.get("answer", "Answer."),
                                "source_chunk_id": card.get("source_chunk_id") or source_ids[0]
                            }
                            for card in res.get("cards", [])
                        ]
                    }
            except Exception as e:
                logger.warning(f"AI Generation via Gemini failed, falling back to mock: {e}")
        
        # Fallback Mock Generator
        return cls._generate_mock_content(chunks, content_type, mode, asset_title)

    @staticmethod
    def _build_prompt(text: str, content_type: str, mode: str, asset_title: str) -> str:
        """Helper to build prompt instruction templates depending on type and mode."""
        base_instruction = (
            f"You are an expert AI tutor. Analyze the following study material titled '{asset_title}' "
            f"and generate a learning aid. The mode is '{mode}'.\n"
            "Format the output strictly as a JSON object, without markdown formatting blocks (do not wrap in ```json or ```).\n"
        )
        
        if content_type == "summary":
            mode_detail = ""
            if mode == "Quick Study":
                mode_detail = "concise, high-level overview, keeping sentences short."
            elif mode == "Exam Revision":
                mode_detail = "detailed breakdown mapping core concepts for exams."
            elif mode == "Interview Preparation":
                mode_detail = "concept-focused highlights explaining practical/technical mechanics."
                
            return base_instruction + (
                f"Content Type: Summary ({mode_detail})\n"
                "JSON format required:\n"
                "{\n"
                "  \"short_summary\": \"Provide a 2-3 sentence overview.\",\n"
                "  \"detailed_summary\": \"Provide a detailed summary mapping main ideas.\",\n"
                "  \"key_concepts\": [\n"
                "     { \"concept\": \"Name of Concept\", \"explanation\": \"Explanation of concept.\", \"source_chunk_id\": \"Provide the exact Chunk ID from the text that mentions this concept\" }\n"
                "  ]\n"
                "}\n"
                f"Source Material:\n{text}"
            )
            
        elif content_type == "revision_notes":
            mode_detail = ""
            if mode == "Quick Study":
                mode_detail = "concise revision notes."
            elif mode == "Exam Revision":
                mode_detail = "detailed notes focusing on formulas, theorems, and definitions."
            elif mode == "Interview Preparation":
                mode_detail = "core answers to potential viva/interview questions."
                
            return base_instruction + (
                f"Content Type: Revision Notes ({mode_detail})\n"
                "JSON format required:\n"
                "{\n"
                "  \"exam_notes\": \"Bulleted markdown listing core exam/viva notes.\",\n"
                "  \"quick_notes\": \"Bulleted markdown containing quick study snippets.\",\n"
                "  \"important_topics\": [\n"
                "     { \"topic\": \"Topic Title\", \"notes\": \"Notes about topic\", \"source_chunk_id\": \"Provide the exact Chunk ID from the text that mentions this topic\" }\n"
                "  ]\n"
                "}\n"
                f"Source Material:\n{text}"
            )
            
        elif content_type == "flashcards":
            mode_detail = ""
            if mode == "Quick Study":
                mode_detail = "concise cards focusing on basic terminology."
            elif mode == "Exam Revision":
                mode_detail = "formula and definition cards."
            elif mode == "Interview Preparation":
                mode_detail = "interview-oriented Q&A cards with clear answers."
                
            return base_instruction + (
                f"Content Type: Flashcards ({mode_detail})\n"
                "JSON format required:\n"
                "{\n"
                "  \"cards\": [\n"
                "     { \"question\": \"Question text?\", \"answer\": \"Answer text.\", \"source_chunk_id\": \"Provide the exact Chunk ID from the text that contains the answer\" }\n"
                "  ]\n"
                "}\n"
                f"Source Material:\n{text}"
            )
        return ""

    @staticmethod
    def _generate_mock_content(chunks: List[Dict[str, Any]], content_type: str, mode: str, asset_title: str) -> Dict[str, Any]:
        """Generates realistic mock content with chunk source citation links."""
        source_ids = [c["_id"] for c in chunks]
        topic = chunks[0]["concept_tags"][0] if chunks and chunks[0]["concept_tags"] else "General Study"
        keywords = []
        for c in chunks:
            keywords.extend(c.get("keywords", []))
        keywords = list(set(keywords))[:5]
        
        # Helper to extract a sentence
        def get_sentence(c):
            t = c["chunk_text"].strip()
            # find first sentence
            parts = re.split(r'[.!?]', t)
            return parts[0].strip() + "." if parts else t[:100]

        if content_type == "summary":
            short_sum = f"This document outlines key principles of {topic} with a focus on {', '.join(keywords[:3])}."
            if mode == "Quick Study":
                detailed_sum = f"Quick Study Guide for {asset_title}. Key concepts cover {topic}. Essential for rapid review before class."
            elif mode == "Exam Revision":
                detailed_sum = f"Detailed Exam Prep Guide for {asset_title}. Highlights critical topics, mapping technical parameters for final examinations."
            else:
                detailed_sum = f"Interview Prep Summary. Evaluates candidate core knowledge in {topic}, highlighting common industry challenges."
                
            key_concepts = []
            for idx, c in enumerate(chunks[:6]):
                tags = c.get("concept_tags", [])
                concept_name = tags[0] if tags else f"Concept {idx+1}"
                key_concepts.append({
                    "concept": concept_name,
                    "explanation": get_sentence(c) + " This provides foundational understanding.",
                    "source_chunk_id": c["_id"]
                })
                
            return {
                "short_summary": short_sum,
                "detailed_summary": detailed_sum,
                "key_concepts": key_concepts
            }
            
        elif content_type == "revision_notes":
            exam_notes = f"### Takeaways for {topic}\n"
            for c in chunks[:4]:
                exam_notes += f"- **Key point**: {get_sentence(c)}\n"
                
            quick_notes = f"### Bullet Reference\n"
            for kw in keywords[:4]:
                quick_notes += f"- Study definitions and uses of *{kw.capitalize()}*.\n"
                
            important_topics = []
            for idx, c in enumerate(chunks[:5]):
                tags = c.get("concept_tags", [])
                topic_name = tags[0] if len(tags) > 0 else f"Topic {idx+1}"
                important_topics.append({
                    "topic": topic_name,
                    "notes": f"Includes crucial details on {topic_name}. Detailed reference text: '{c['chunk_text'][:120]}...'",
                    "source_chunk_id": c["_id"]
                })
                
            return {
                "exam_notes": exam_notes,
                "quick_notes": quick_notes,
                "important_topics": important_topics
            }
            
        elif content_type == "flashcards":
            cards = []
            for idx, c in enumerate(chunks[:8]):
                tags = c.get("concept_tags", [])
                tag = tags[0] if tags else "this topic"
                
                if mode == "Interview Preparation":
                    question = f"What are the main interview questions concerning {tag}?"
                    answer = f"Candidates should explain that: {get_sentence(c)} This covers operational concepts."
                elif mode == "Exam Revision":
                    question = f"Define the core exam formula/theorem for {tag}."
                    answer = f"The theorem dictates: {get_sentence(c)} Verify details in original context."
                else:
                    question = f"What is the basic definition of {tag}?"
                    answer = f"It refers to: {get_sentence(c)}"
                    
                cards.append({
                    "question": question,
                    "answer": answer,
                    "source_chunk_id": c["_id"]
                })
                
            return {
                "cards": cards
            }
            
        return {}
