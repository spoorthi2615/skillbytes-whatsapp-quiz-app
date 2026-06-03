from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository

class AssetRepository(BaseRepository):
    def __init__(self):
        super().__init__("user_assets")

    async def create_asset(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id, "status": {"$ne": "deleted"}})
        return await cursor.to_list(length=None)

    async def get_by_id(self, asset_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": asset_id})

    async def soft_delete(self, asset_id: str, user_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": asset_id, "user_id": user_id},
            {"$set": {"status": "deleted", "deleted_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

    async def get_by_type(self, user_id: str, asset_type: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({
            "user_id": user_id,
            "type": asset_type,
            "status": {"$ne": "deleted"}
        })
        return await cursor.to_list(length=None)

asset_repo = AssetRepository()
