from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorCollection
from app.core.database import get_database

class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self) -> AsyncIOMotorCollection:
        db = get_database()
        return db[self.collection_name]

    async def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": id})

    async def get_all(self, filter_query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        query = filter_query or {}
        cursor = self.collection.find(query)
        return await cursor.to_list(length=1000)

    async def create(self, document: Dict[str, Any]) -> str:
        result = await self.collection.insert_one(document)
        return str(result.inserted_id)

    async def update(self, id: str, update_data: Dict[str, Any]) -> bool:
        result = await self.collection.update_one({"_id": id}, {"$set": update_data})
        return result.modified_count > 0

    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        cursor = self.collection.aggregate(pipeline)
        return await cursor.to_list(length=1000)
