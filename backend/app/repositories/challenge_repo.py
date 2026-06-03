from datetime import datetime, timezone
from typing import List, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId

class ChallengeRepository(BaseRepository):
    def __init__(self):
        super().__init__("daily_challenges")

    async def get_todays_challenge(self) -> Dict[str, Any]:
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        challenge = await self.collection.find_one({"date_str": today_str})
        
        if not challenge:
            # Create a generic dummy challenge for today
            challenge = {
                "_id": str(ObjectId()),
                "date_str": today_str,
                "title": "Data Structures Quiz",
                "description": "Complete the Arrays and Lists quiz with a perfect score.",
                "xp_reward": 150,
                "created_at": datetime.now(timezone.utc)
            }
            await self.collection.insert_one(challenge)
            
        return challenge

    async def is_completed(self, user_id: str, challenge_id: str) -> bool:
        db = self.collection.database
        doc = await db["user_challenges"].find_one({"user_id": user_id, "challenge_id": challenge_id})
        return doc is not None

challenge_repo = ChallengeRepository()
