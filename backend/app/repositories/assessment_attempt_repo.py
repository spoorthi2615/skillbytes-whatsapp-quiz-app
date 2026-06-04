from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository

class AssessmentAttemptRepository(BaseRepository):
    def __init__(self):
        super().__init__("assessment_attempts")

    async def get_by_assessment(self, user_id: str, assessment_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id, "assessment_id": assessment_id}).sort("attempt_number", 1)
        return await cursor.to_list(length=None)

    async def get_count_for_assessment(self, user_id: str, assessment_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id, "assessment_id": assessment_id})

    async def create_attempt(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

assessment_attempt_repo = AssessmentAttemptRepository()
