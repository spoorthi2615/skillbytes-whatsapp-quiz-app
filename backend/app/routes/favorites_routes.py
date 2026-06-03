from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
from app.repositories.favorites_repo import favorites_repo
from app.core.security import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])

class FavoriteRequest(BaseModel):
    content_id: str
    content_type: str
    title: str

def success(data):
    return {"success": True, "data": data}

@router.post("")
async def add_favorite(body: FavoriteRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    # Check if already favorited
    is_fav = await favorites_repo.is_favorite(user_id, body.content_id)
    if is_fav:
        return success("Already in favorites")
        
    doc = {
        "_id": str(ObjectId()),
        "user_id": user_id,
        "content_id": body.content_id,
        "content_type": body.content_type,
        "title": body.title,
        "created_at": datetime.now(timezone.utc)
    }
    
    await favorites_repo.add_favorite(doc)
    return success(doc)

@router.get("")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    favs = await favorites_repo.get_by_user(user_id)
    return success(favs)

@router.delete("/{content_id}")
async def remove_favorite(content_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    removed = await favorites_repo.delete_favorite(user_id, content_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return success("Removed from favorites")
