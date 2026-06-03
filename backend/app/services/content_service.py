from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from app.repositories.content_repo import generated_content_repo

class ContentService:
    @staticmethod
    async def get_content_for_job(job_id: str, user_id: str) -> Dict[str, Any]:
        content = await generated_content_repo.get_by_job(job_id)
        if not content:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
        if content.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return content

    @staticmethod
    async def list_content(user_id: str) -> List[Dict[str, Any]]:
        return await generated_content_repo.get_by_user(user_id)

    @staticmethod
    async def list_by_type(user_id: str, content_type: str) -> List[Dict[str, Any]]:
        return await generated_content_repo.get_by_type(user_id, content_type)

    @staticmethod
    async def store_result(user_id: str, asset_id: str, job_id: str, content_type: str, title: str, content_data: Dict[str, Any]) -> str:
        # Stub to be called by background worker when generation completes
        content_id = str(ObjectId())
        doc = {
            "_id": content_id,
            "user_id": user_id,
            "asset_id": asset_id,
            "job_id": job_id,
            "content_type": content_type,
            "title": title,
            "content": content_data,
            "created_at": datetime.now(timezone.utc)
        }
        return await generated_content_repo.create_content(doc)
