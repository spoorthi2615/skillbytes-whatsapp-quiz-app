from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository

class ChunkRepository(BaseRepository):
    def __init__(self):
        super().__init__("content_chunks")

    async def insert_chunks(self, docs: List[Dict[str, Any]]) -> bool:
        if not docs:
            return False
        result = await self.collection.insert_many(docs)
        return len(result.inserted_ids) > 0

    async def get_by_asset(self, asset_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"asset_id": asset_id})
        return await cursor.to_list(length=None)

    async def delete_by_asset(self, asset_id: str) -> int:
        result = await self.collection.delete_many({"asset_id": asset_id})
        return result.deleted_count

    async def get_by_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": chunk_id})

chunk_repo = ChunkRepository()
