from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.repositories.ai_job_repo import ai_job_repo
from app.repositories.asset_repo import asset_repo

class AIJobService:
    @staticmethod
    async def create_job(user_id: str, asset_id: str, job_type: str) -> str:
        # Validate that user owns the asset
        asset = await asset_repo.get_by_id(asset_id)
        if not asset or asset.get("status") == "deleted":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        if asset.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
        supported_types = [
            "generate_quiz", "generate_flashcards", "generate_summary",
            "resume_analysis", "generate_interview_questions", "generate_coding_questions"
        ]
        if job_type not in supported_types:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported job type: {job_type}")
            
        return await ai_job_repo.create_job(user_id, asset_id, job_type)

    @staticmethod
    async def get_job_status(job_id: str, user_id: str) -> Dict[str, Any]:
        job = await ai_job_repo.get_job(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        if job.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return job

    @staticmethod
    async def list_jobs(user_id: str) -> List[Dict[str, Any]]:
        return await ai_job_repo.get_jobs_by_user(user_id)

    @staticmethod
    async def process_job(job_id: str):
        # Stub placeholder for future background LLM worker pipeline
        pass
