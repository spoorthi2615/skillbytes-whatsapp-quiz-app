from fastapi import APIRouter, Depends
from app.services.notification_service import NotificationService
from app.core.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await NotificationService.get_feed(current_user["_id"])
    return {"success": True, "data": notifications}

@router.put("/read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    count = await NotificationService.mark_all_read(current_user["_id"])
    return {"success": True, "data": {"marked_count": count}}

@router.put("/{notification_id}/read")
async def mark_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    success = await NotificationService.mark_read(notification_id, current_user["_id"])
    return {"success": success, "data": None}
