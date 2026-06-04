from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository

class AssessmentResultRepository(BaseRepository):
    def __init__(self):
        super().__init__("assessment_results")

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def get_latest_for_assessment(self, user_id: str, assessment_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one(
            {"user_id": user_id, "assessment_id": assessment_id},
            sort=[("created_at", -1)]
        )

    async def get_best_for_assessment(self, user_id: str, assessment_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one(
            {"user_id": user_id, "assessment_id": assessment_id},
            sort=[("score", -1), ("created_at", -1)]
        )

    async def create_result(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

assessment_result_repo = AssessmentResultRepository()
