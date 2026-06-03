from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository
from bson import ObjectId

class GeneratedContentRepository(BaseRepository):
    def __init__(self):
        super().__init__("generated_content")

    async def create_content(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def get_by_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"job_id": job_id})

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def get_by_type(self, user_id: str, content_type: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id, "content_type": content_type}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def get_by_id(self, content_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": content_id})

generated_content_repo = GeneratedContentRepository()
