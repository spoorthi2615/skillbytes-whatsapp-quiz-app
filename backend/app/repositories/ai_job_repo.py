from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository
from bson import ObjectId

class AIJobRepository(BaseRepository):
    def __init__(self):
        super().__init__("ai_jobs")

    async def create_job(self, user_id: str, asset_id: str, job_type: str, generation_mode: str = "Quick Study") -> str:
        doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "asset_id": asset_id,
            "job_type": job_type,
            "generation_mode": generation_mode,
            "status": "pending",
            "progress": 0,
            "current_step": "upload",
            "result_id": None,
            "created_at": datetime.now(timezone.utc),
            "completed_at": None
        }
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": job_id})

    async def get_jobs_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def update_status(self, job_id: str, status: str, result_id: Optional[str] = None, progress: Optional[int] = None, current_step: Optional[str] = None) -> bool:
        update_data = {
            "status": status,
            "completed_at": datetime.now(timezone.utc) if status in ["completed", "failed"] else None
        }
        if result_id:
            update_data["result_id"] = result_id
        if progress is not None:
            update_data["progress"] = progress
        if current_step is not None:
            update_data["current_step"] = current_step
        result = await self.collection.update_one({"_id": job_id}, {"$set": update_data})
        return result.modified_count > 0

    async def get_pending_jobs(self) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"status": "pending"})
        return await cursor.to_list(length=None)

ai_job_repo = AIJobRepository()
