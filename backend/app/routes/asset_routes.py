from fastapi import APIRouter, Depends
from app.services.asset_service import AssetService
from app.core.security import get_current_user

router = APIRouter(prefix="/assets", tags=["assets"])

@router.get("")
async def get_assets(current_user: dict = Depends(get_current_user)):
    assets = await AssetService.list_assets(current_user["_id"])
    return {"success": True, "data": assets}

@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    success = await AssetService.delete_asset(asset_id, current_user["_id"])
    return {"success": success}
