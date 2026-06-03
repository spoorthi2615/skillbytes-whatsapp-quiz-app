from fastapi import APIRouter, Depends
from app.repositories.history_repo import history_repo
from app.core.security import get_current_user

router = APIRouter(prefix="/history", tags=["history"])

@router.get("")
async def get_history(current_user: dict = Depends(get_current_user)):
    history = await history_repo.get_user_history(current_user["_id"])
    return {"success": True, "data": history}
