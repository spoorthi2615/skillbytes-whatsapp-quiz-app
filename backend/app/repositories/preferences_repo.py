from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId


class PreferencesRepository(BaseRepository):
    def __init__(self):
        super().__init__("user_preferences")

    async def get_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"user_id": user_id})

    async def upsert_preferences(self, user_id: str, data: Dict[str, Any]) -> bool:
        data["user_id"] = user_id
        data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"user_id": user_id},
            {
                "$set": data,
                "$setOnInsert": {
                    "_id": str(ObjectId()),
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )
        return result.acknowledged

    async def create_defaults(self, user_id: str, preferred_language: str = "Python") -> str:
        """Called during user registration to create a default preferences document."""
        existing = await self.get_preferences(user_id)
        if existing:
            return existing["_id"]
        doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "preferred_language": preferred_language,
            "theme": "dark",
            "notifications_enabled": True,
            "selected_tracks": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await self.collection.insert_one(doc)
        return doc["_id"]


preferences_repo = PreferencesRepository()
