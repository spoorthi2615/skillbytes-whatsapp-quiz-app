from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from bson import ObjectId
from app.repositories.chunk_repo import chunk_repo
import re

class ChunkingService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        if not text:
            return []
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
        chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            if len(current_chunk) + len(p) + 1 <= chunk_size:
                if current_chunk:
                    current_chunk += "\n" + p
                else:
                    current_chunk = p
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                    tail = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = tail + "\n" + p
                else:
                    # Paragraph is longer than chunk_size, slice character-wise
                    start = 0
                    while start < len(p):
                        end = start + chunk_size
                        chunks.append(p[start:end])
                        start += (chunk_size - overlap)
                    current_chunk = ""
                    
        if current_chunk:
            chunks.append(current_chunk)
        return chunks

    @staticmethod
    def extract_keywords(text: str, top_n: int = 5) -> List[str]:
        stopwords = {
            "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "at", "by", "for", "with",
            "about", "against", "between", "into", "through", "during", "before", "after", "above", "below",
            "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then",
            "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
            "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
            "very", "s", "t", "can", "will", "just", "don", "should", "now", "this", "that", "these", "those",
            "is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
            "did", "doing", "would", "should", "could", "ought", "i", "you", "he", "she", "it", "we", "they",
            "me", "him", "her", "us", "them", "my", "your", "his", "their", "its"
        }
        
        words = re.findall(r'\b[a-zA-Z]{4,15}\b', text.lower())
        candidates = [w for w in words if w not in stopwords]
        
        freq = {}
        for w in candidates:
            freq[w] = freq.get(w, 0) + 1
            
        sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [item[0] for item in sorted_freq[:top_n]]

    @classmethod
    def analyze_chunk(cls, text: str) -> Tuple[float, List[str], List[str]]:
        sentences = [s.strip() for s in re.split(r'[.!?]', text) if s.strip()]
        sentence_count = len(sentences) or 1
        words = text.split()
        word_count = len(words) or 1
        
        avg_word_len = sum(len(w) for w in words) / word_count
        avg_sentence_len = word_count / sentence_count
        
        raw_score = (avg_word_len * 1.2) + (avg_sentence_len * 0.15)
        difficulty_score = min(10.0, max(1.0, round(raw_score, 1)))
        
        keywords = cls.extract_keywords(text, top_n=4)
        concept_tags = [kw.capitalize() for kw in keywords]
        
        learning_objectives = []
        if len(keywords) >= 1:
            learning_objectives.append(f"Explain the foundational concepts of {keywords[0].capitalize()}.")
        if len(keywords) >= 2:
            learning_objectives.append(f"Analyze the relationship and integration of {keywords[1].capitalize()}.")
        if len(keywords) >= 3:
            learning_objectives.append(f"Apply principles of {keywords[2].capitalize()} to solve related challenges.")
            
        if not learning_objectives:
            learning_objectives.append("Analyze the key learning structures of the material.")
            
        return difficulty_score, concept_tags, learning_objectives

    @classmethod
    async def process_and_store_chunks(cls, asset_id: str, text: str) -> List[str]:
        chunks = cls.chunk_text(text)
        docs = []
        now = datetime.now(timezone.utc)
        
        for idx, chunk in enumerate(chunks):
            difficulty, tags, objectives = cls.analyze_chunk(chunk)
            keywords = cls.extract_keywords(chunk, top_n=5)
            
            chunk_doc = {
                "_id": str(ObjectId()),
                "asset_id": asset_id,
                "chunk_text": chunk,
                "keywords": keywords,
                "difficulty_score": difficulty,
                "concept_tags": tags,
                "learning_objectives": objectives,
                "created_at": now
            }
            docs.append(chunk_doc)
            
        if docs:
            await chunk_repo.insert_chunks(docs)
            return [doc["_id"] for doc in docs]
        return []
