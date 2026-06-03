from fastapi import APIRouter, Depends
from app.services.profile_service import ProfileService
from app.core.security import get_current_user
from app.schemas.domain import UpdateProfileRequest

router = APIRouter(tags=["profile"])


def ok(data):
    return {"success": True, "data": data}


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    result = await ProfileService.get_profile(current_user["_id"])
    return ok(result)


@router.put("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    result = await ProfileService.update_profile(current_user["_id"], body.model_dump())
    return ok(result)


@router.get("/u/{username}")
async def get_public_profile(username: str):
    """Public profile endpoint — no auth required."""
    result = await ProfileService.get_public_profile(username)
    return ok(result)
