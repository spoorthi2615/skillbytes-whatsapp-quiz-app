from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository
from bson import ObjectId

class CodingSubmissionRepository(BaseRepository):
    def __init__(self):
        super().__init__("coding_submissions")

    async def get_by_user_and_question(self, user_id: str, question_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"user_id": user_id, "question_id": question_id})

    async def save_submission(self, user_id: str, question_id: str, language: str, solution: str) -> str:
        now = datetime.now(timezone.utc)
        existing = await self.get_by_user_and_question(user_id, question_id)
        
        if existing:
            await self.collection.update_one(
                {"_id": existing["_id"]},
                {"$set": {"language": language, "solution": solution, "created_at": now}}
            )
            return existing["_id"]
        else:
            doc = {
                "_id": str(ObjectId()),
                "user_id": user_id,
                "question_id": question_id,
                "language": language,
                "solution": solution,
                "created_at": now
            }
            await self.collection.insert_one(doc)
            return doc["_id"]

coding_submission_repo = CodingSubmissionRepository()
