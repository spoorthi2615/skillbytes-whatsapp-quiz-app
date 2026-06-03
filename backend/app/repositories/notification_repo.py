from datetime import datetime, timezone
from typing import List, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId

class NotificationRepository(BaseRepository):
    def __init__(self):
        super().__init__("notifications")

    async def get_user_notifications(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def create_notification(self, user_id: str, title: str, message: str, type: str = "system") -> str:
        doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        res = await self.collection.update_one(
            {"_id": notification_id, "user_id": user_id},
            {"$set": {"is_read": True}}
        )
        return res.modified_count > 0

    async def mark_all_as_read(self, user_id: str) -> int:
        res = await self.collection.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}}
        )
        return res.modified_count

notification_repo = NotificationRepository()
