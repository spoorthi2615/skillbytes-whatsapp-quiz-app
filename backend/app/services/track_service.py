from app.repositories.track_repo import track_repo

class TrackService:
    @staticmethod
    async def get_all_tracks():
        await track_repo.seed_tracks() # ensure seeded
        return await track_repo.get_all_tracks()

    @staticmethod
    async def get_track_modules(track_id: str):
        track = await track_repo.get_track_by_id(track_id)
        if not track: return []
        return track.get("modules", [])
