from datetime import datetime, timezone
from typing import List, Dict, Any
from app.repositories.base import BaseRepository
from bson import ObjectId

class TrackRepository(BaseRepository):
    def __init__(self):
        super().__init__("learning_tracks")

    async def get_all_tracks(self) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"is_active": True}).sort("order", 1)
        return await cursor.to_list(length=None)

    async def get_track_by_id(self, track_id: str) -> Dict[str, Any]:
        return await self.collection.find_one({"_id": track_id})

    async def seed_tracks(self):
        # Insert some dummy data if empty
        count = await self.collection.count_documents({})
        if count == 0:
            tracks = [
                {"_id": "track_python", "title": "Python Masterclass", "description": "From zero to hero in Python", "icon": "🐍", "order": 1, "is_active": True, "modules": [{"title": "Basics", "xp": 100}, {"title": "OOP", "xp": 200}]},
                {"_id": "track_web", "title": "Web Fundamentals", "description": "HTML, CSS, JS", "icon": "🌐", "order": 2, "is_active": True, "modules": [{"title": "HTML", "xp": 50}, {"title": "CSS", "xp": 100}]}
            ]
            await self.collection.insert_many(tracks)

track_repo = TrackRepository()
