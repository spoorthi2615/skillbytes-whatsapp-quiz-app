from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from app.repositories.asset_repo import asset_repo

class AssetService:
    @staticmethod
    async def list_assets(user_id: str) -> List[Dict[str, Any]]:
        return await asset_repo.get_by_user(user_id)

    @staticmethod
    async def delete_asset(asset_id: str, user_id: str) -> bool:
        asset = await asset_repo.get_by_id(asset_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        if asset.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return await asset_repo.soft_delete(asset_id, user_id)

    @staticmethod
    async def get_asset(asset_id: str, user_id: str) -> Dict[str, Any]:
        asset = await asset_repo.get_by_id(asset_id)
        if not asset or asset.get("status") == "deleted":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        if asset.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return asset

    @staticmethod
    async def create_asset_record(user_id: str, metadata: Dict[str, Any]) -> str:
        # Stub for future upload flow integration
        now = datetime.now(timezone.utc)
        asset_id = str(ObjectId())
        doc = {
            "_id": asset_id,
            "user_id": user_id,
            "type": metadata.get("type", "material"),
            "title": metadata.get("title", "Untitled Asset"),
            "file_name": metadata.get("file_name", ""),
            "storage_path": metadata.get("storage_path", ""),
            "mime_type": metadata.get("mime_type", ""),
            "file_size": metadata.get("file_size", 0),
            "uploaded_at": now,
            "status": "uploaded"
        }
        return await asset_repo.create_asset(doc)
