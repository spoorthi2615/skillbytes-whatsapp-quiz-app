from fastapi import APIRouter, Depends
from app.services.recommendation_service import RecommendationService
from app.core.security import get_current_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    recs = await RecommendationService.get_recommendations(current_user["_id"])
    return {"success": True, "data": recs}
