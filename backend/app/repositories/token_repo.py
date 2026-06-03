from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId

class RefreshTokenRepository(BaseRepository):
    def __init__(self):
        super().__init__("refresh_tokens")

    async def store_token(self, user_id: str, token: str, expires_at: datetime) -> str:
        doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "token": token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        await self.collection.insert_one(doc)
        return doc["_id"]

    async def get_token(self, token: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"token": token})

    async def revoke_token(self, token: str) -> bool:
        result = await self.collection.delete_one({"token": token})
        return result.deleted_count > 0

    async def revoke_all_for_user(self, user_id: str) -> int:
        result = await self.collection.delete_many({"user_id": user_id})
        return result.deleted_count

    async def rotate_token(self, old_token: str, new_token: str, new_expires_at: datetime) -> bool:
        result = await self.collection.update_one(
            {"token": old_token},
            {"$set": {"token": new_token, "expires_at": new_expires_at, "created_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

token_repo = RefreshTokenRepository()
