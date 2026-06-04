from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.repositories.base import BaseRepository
from bson import ObjectId

class ConceptMasteryRepository(BaseRepository):
    def __init__(self):
        super().__init__("concept_mastery")

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("mastery_score", -1)
        return await cursor.to_list(length=None)

    async def get_concept(self, user_id: str, concept: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"user_id": user_id, "concept": concept})

    async def update_mastery(self, user_id: str, concept: str, score_delta: float) -> bool:
        now = datetime.now(timezone.utc)
        record = await self.get_concept(user_id, concept)
        
        if record:
            current_score = record.get("mastery_score", 0.5)
            # Clip between 0.0 and 1.0
            new_score = max(0.0, min(1.0, current_score + score_delta))
            attempts = record.get("attempts", 0) + 1
            result = await self.collection.update_one(
                {"_id": record["_id"]},
                {"$set": {"mastery_score": new_score, "attempts": attempts, "last_updated": now}}
            )
            return result.modified_count > 0
        else:
            new_score = max(0.0, min(1.0, 0.5 + score_delta))
            doc = {
                "_id": str(ObjectId()),
                "user_id": user_id,
                "concept": concept,
                "mastery_score": new_score,
                "attempts": 1,
                "last_updated": now
            }
            await self.collection.insert_one(doc)
            return True

concept_mastery_repo = ConceptMasteryRepository()
