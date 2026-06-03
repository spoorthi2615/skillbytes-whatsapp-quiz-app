from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.repositories.content_repo import generated_content_repo
from app.repositories.asset_repo import asset_repo
from app.repositories.chunk_repo import chunk_repo
from app.core.security import get_current_user

router = APIRouter(prefix="/content", tags=["content"])

class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback: str = ""

def success(data):
    return {"success": True, "data": data}

@router.get("")
async def list_content(content_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    if content_type:
        content = await generated_content_repo.get_by_type(user_id, content_type)
    else:
        content = await generated_content_repo.get_by_user(user_id)
    return success(content)

@router.get("/{content_id}")
async def get_content(content_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    content = await generated_content_repo.get_by_id(content_id)
    if not content or content.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Content not found")
    return success(content)

@router.delete("/{content_id}")
async def delete_content(content_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    content = await generated_content_repo.get_by_id(content_id)
    if not content or content.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Content not found")
        
    result = await generated_content_repo.collection.delete_one({"_id": content_id})
    return success({"deleted": result.deleted_count > 0})

@router.post("/{content_id}/feedback")
async def submit_feedback(content_id: str, body: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    content = await generated_content_repo.get_by_id(content_id)
    if not content or content.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Content not found")
        
    result = await generated_content_repo.collection.update_one(
        {"_id": content_id},
        {"$set": {"rating": body.rating, "feedback": body.feedback}}
    )
    return success({"updated": result.modified_count > 0})

@router.get("/{content_id}/history")
async def get_version_history(content_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    content = await generated_content_repo.get_by_id(content_id)
    if not content or content.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Content not found")
        
    parent_id = content.get("parent_content_id") or content["_id"]
    history = await generated_content_repo.get_version_history(user_id, parent_id)
    return success(history)

@router.post("/{content_id}/restore")
async def restore_version(content_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    target = await generated_content_repo.get_by_id(content_id)
    if not target or target.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Content version not found")
        
    asset_id = target["asset_id"]
    content_type = target["content_type"]
    latest = await generated_content_repo.get_latest_version(user_id, asset_id, content_type)
    
    new_version = (latest["version"] + 1) if latest else (target["version"] + 1)
    parent_id = target.get("parent_content_id") or target["_id"]
    
    new_doc = target.copy()
    new_doc["_id"] = str(ObjectId())
    new_doc["version"] = new_version
    new_doc["parent_content_id"] = parent_id
    new_doc["created_at"] = datetime.now(timezone.utc)
    
    await generated_content_repo.create_content(new_doc)
    return success(new_doc)

@router.get("/chunks/{chunk_id}")
async def get_chunk_content(chunk_id: str, current_user: dict = Depends(get_current_user)):
    chunk = await chunk_repo.get_by_id(chunk_id)
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
        
    asset = await asset_repo.get_by_id(chunk["asset_id"])
    if not asset or asset.get("user_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return success(chunk)
