from datetime import datetime, timezone
from typing import List, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId

class HistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__("user_history")

    async def get_user_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("completed_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def add_history_entry(self, user_id: str, action: str, details: Dict[str, Any]) -> str:
        doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "action": action,
            "details": details,
            "completed_at": datetime.now(timezone.utc)
        }
        await self.collection.insert_one(doc)
        return doc["_id"]

history_repo = HistoryRepository()
