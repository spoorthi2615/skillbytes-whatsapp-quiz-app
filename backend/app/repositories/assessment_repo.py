from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository

class AssessmentRepository(BaseRepository):
    def __init__(self):
        super().__init__("generated_assessments")

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def create_assessment(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def delete_assessment(self, id: str) -> bool:
        result = await self.collection.delete_one({"_id": id})
        return result.deleted_count > 0

assessment_repo = AssessmentRepository()
