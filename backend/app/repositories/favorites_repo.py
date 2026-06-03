from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository

class FavoritesRepository(BaseRepository):
    def __init__(self):
        super().__init__("favorites")

    async def add_favorite(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def delete_favorite(self, user_id: str, content_id: str) -> bool:
        result = await self.collection.delete_one({"user_id": user_id, "content_id": content_id})
        return result.deleted_count > 0

    async def is_favorite(self, user_id: str, content_id: str) -> bool:
        doc = await self.collection.find_one({"user_id": user_id, "content_id": content_id})
        return doc is not None

favorites_repo = FavoritesRepository()
