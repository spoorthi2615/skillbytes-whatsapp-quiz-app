from fastapi import APIRouter, Depends
from app.services.preferences_service import PreferencesService
from app.core.security import get_current_user
from app.schemas.domain import UpdatePreferencesRequest

router = APIRouter(tags=["preferences"])


def ok(data):
    return {"success": True, "data": data}


@router.get("/preferences")
async def get_preferences(current_user: dict = Depends(get_current_user)):
    result = await PreferencesService.get_preferences(current_user["_id"])
    return ok(result)


@router.put("/preferences")
async def update_preferences(
    body: UpdatePreferencesRequest,
    current_user: dict = Depends(get_current_user),
):
    result = await PreferencesService.update_preferences(current_user["_id"], body.model_dump())
    return ok(result)
