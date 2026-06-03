from fastapi import APIRouter, Depends
from app.services.xp_service import XPService
from app.core.security import get_current_user

router = APIRouter(prefix="/xp", tags=["xp"])

@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    history = await XPService.get_history(current_user["_id"])
    return {"success": True, "data": history}
