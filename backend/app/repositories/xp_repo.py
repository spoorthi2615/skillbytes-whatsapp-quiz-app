from datetime import datetime, timezone
from typing import List, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId

class XPRepository(BaseRepository):
    def __init__(self):
        super().__init__("xp_history")

    async def get_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("earned_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def add_xp_entry(self, user_id: str, amount: int, reason: str, source_id: str = None) -> str:
        doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "amount": amount,
            "reason": reason,
            "source_id": source_id,
            "earned_at": datetime.now(timezone.utc)
        }
        await self.collection.insert_one(doc)
        return doc["_id"]

xp_repo = XPRepository()
