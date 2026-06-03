from datetime import datetime, timezone
from typing import List, Dict, Any
from app.repositories.base import BaseRepository

class SessionRepository(BaseRepository):
    def __init__(self):
        super().__init__("learning_sessions")

    async def log_session(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})

session_repo = SessionRepository()
