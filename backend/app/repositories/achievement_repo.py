from datetime import datetime, timezone
from typing import List, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId

class AchievementRepository(BaseRepository):
    def __init__(self):
        super().__init__("user_achievements")

    async def get_user_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("unlocked_at", -1)
        return await cursor.to_list(length=None)

    async def has_achievement(self, user_id: str, achievement_id: str) -> bool:
        doc = await self.collection.find_one({"user_id": user_id, "achievement_id": achievement_id})
        return doc is not None

    async def unlock_achievement(self, user_id: str, achievement_id: str) -> str:
        doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "achievement_id": achievement_id,
            "unlocked_at": datetime.now(timezone.utc),
            "is_new": True
        }
        await self.collection.insert_one(doc)
        return doc["_id"]

achievement_repo = AchievementRepository()
