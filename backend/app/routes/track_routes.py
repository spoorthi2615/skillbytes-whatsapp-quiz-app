from fastapi import APIRouter
from app.services.track_service import TrackService

router = APIRouter(prefix="/tracks", tags=["tracks"])

@router.get("")
async def get_tracks():
    tracks = await TrackService.get_all_tracks()
    return {"success": True, "data": tracks}

@router.get("/{track_id}/modules")
async def get_modules(track_id: str):
    modules = await TrackService.get_track_modules(track_id)
    return {"success": True, "data": modules}
