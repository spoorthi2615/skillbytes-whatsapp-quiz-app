from fastapi import APIRouter, Depends
from app.services.achievement_service import AchievementService
from app.core.security import get_current_user

router = APIRouter(prefix="/achievements", tags=["achievements"])

@router.get("")
async def get_all_achievements():
    defs = await AchievementService.get_all_definitions()
    return {"success": True, "data": defs}

@router.get("/mine")
async def get_my_achievements(current_user: dict = Depends(get_current_user)):
    achievements = await AchievementService.get_user_achievements(current_user["_id"])
    return {"success": True, "data": achievements}
