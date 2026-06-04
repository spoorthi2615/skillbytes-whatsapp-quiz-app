from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository

class QuestionRepository(BaseRepository):
    def __init__(self):
        super().__init__("generated_questions")

    async def insert_questions(self, docs: List[Dict[str, Any]]) -> bool:
        if not docs:
            return False
        result = await self.collection.insert_many(docs)
        return len(result.inserted_ids) > 0

    async def get_by_assessment(self, assessment_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"assessment_id": assessment_id})
        return await cursor.to_list(length=None)

    async def delete_by_assessment(self, assessment_id: str) -> int:
        result = await self.collection.delete_many({"assessment_id": assessment_id})
        return result.deleted_count

question_repo = QuestionRepository()
