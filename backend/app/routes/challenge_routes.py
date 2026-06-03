from fastapi import APIRouter, Depends
from app.services.challenge_service import ChallengeService
from app.core.security import get_current_user

router = APIRouter(prefix="/daily-challenge", tags=["challenge"])

@router.get("")
async def get_daily_challenge(current_user: dict = Depends(get_current_user)):
    challenge = await ChallengeService.get_today(current_user["_id"])
    return {"success": True, "data": challenge}
