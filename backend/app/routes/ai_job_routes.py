from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.services.ai_job_service import AIJobService
from app.core.security import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

class TriggerJobRequest(BaseModel):
    asset_id: str
    job_type: str
    generation_mode: str = "Quick Study"

@router.get("")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    jobs = await AIJobService.list_jobs(current_user["_id"])
    return {"success": True, "data": jobs}

@router.get("/{job_id}")
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await AIJobService.get_job_status(job_id, current_user["_id"])
    return {"success": True, "data": job}

@router.post("")
async def trigger_job(
    body: TriggerJobRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    job_id = await AIJobService.create_job(user_id, body.asset_id, body.job_type, body.generation_mode)
    
    # Run the processing logic in a background task
    background_tasks.add_task(AIJobService.process_job, job_id)
    
    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "pending",
            "progress": 0,
            "current_step": "upload"
        }
    }
