from fastapi import APIRouter, Depends
from app.services.ai_job_service import AIJobService
from app.core.security import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    jobs = await AIJobService.list_jobs(current_user["_id"])
    return {"success": True, "data": jobs}

@router.get("/{job_id}")
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await AIJobService.get_job_status(job_id, current_user["_id"])
    return {"success": True, "data": job}
