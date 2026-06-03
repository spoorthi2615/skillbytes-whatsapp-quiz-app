from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
from app.repositories.session_repo import session_repo
from app.core.security import get_current_user

router = APIRouter(prefix="/learning-sessions", tags=["sessions"])

class LogSessionRequest(BaseModel):
    content_id: str
    content_type: str
    action: str # "view" | "study"
    duration_ms: int

def success(data):
    return {"success": True, "data": data}

@router.post("")
async def log_session(body: LogSessionRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    doc = {
        "_id": str(ObjectId()),
        "user_id": user_id,
        "content_id": body.content_id,
        "content_type": body.content_type,
        "action": body.action,
        "duration_ms": body.duration_ms,
        "created_at": datetime.now(timezone.utc)
    }
    
    await session_repo.log_session(doc)
    return success(doc)

@router.get("")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    sessions = await session_repo.get_by_user(user_id)
    return success(sessions)
