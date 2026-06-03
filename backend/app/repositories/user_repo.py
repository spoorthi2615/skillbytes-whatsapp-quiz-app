from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"email": email.lower()})

    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"username": username.lower()})

    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": user_id})

    async def create_user(self, doc: Dict[str, Any]) -> str:
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def update_user(self, user_id: str, data: Dict[str, Any]) -> bool:
        result = await self.collection.update_one({"_id": user_id}, {"$set": data})
        return result.modified_count > 0

    async def set_email_verified(self, user_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": user_id},
            {"$set": {"email_verified": True, "verification_token": None}}
        )
        return result.modified_count > 0

    async def set_verification_token(self, user_id: str, token: str) -> bool:
        result = await self.collection.update_one(
            {"_id": user_id},
            {"$set": {"verification_token": token}}
        )
        return result.modified_count > 0

    async def deactivate_user(self, user_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": user_id},
            {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

    async def update_last_active(self, user_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": user_id},
            {"$set": {"last_active_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

user_repo = UserRepository()
