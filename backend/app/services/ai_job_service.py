import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.repositories.ai_job_repo import ai_job_repo
from app.repositories.asset_repo import asset_repo
from loguru import logger

class AIJobService:
    @staticmethod
    async def create_job(user_id: str, asset_id: str, job_type: str, generation_mode: str = "Quick Study") -> str:
        # Validate that user owns the asset
        asset = await asset_repo.get_by_id(asset_id)
        if not asset or asset.get("status") == "deleted":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        if asset.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
        supported_types = [
            "generate_quiz", "generate_flashcards", "generate_summary",
            "resume_analysis", "generate_interview_questions", "generate_coding_questions",
            "summary", "revision_notes", "flashcards"
        ]
        if job_type not in supported_types:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported job type: {job_type}")
            
        return await ai_job_repo.create_job(user_id, asset_id, job_type, generation_mode)

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
        job = await ai_job_repo.get_job(job_id)
        if not job:
            logger.error(f"Job {job_id} not found.")
            return
            
        user_id = job["user_id"]
        asset_id = job["asset_id"]
        job_type = job["job_type"]
        mode = job.get("generation_mode", "Quick Study")
        
        # Normalize job type
        norm_type = job_type.replace("generate_", "")
        if norm_type not in ["summary", "revision_notes", "flashcards"]:
            logger.error(f"Job {job_id} has unsupported type: {job_type}")
            await ai_job_repo.update_status(job_id, "failed", progress=100, current_step="failed")
            return
            
        try:
            # 1. Update status to extracting
            logger.info(f"Processing job {job_id} for user {user_id}. Step: extracting...")
            await ai_job_repo.update_status(job_id, "processing", progress=20, current_step="extracting")
            
            # Get asset info
            asset = await asset_repo.get_by_id(asset_id)
            if not asset or asset.get("status") == "deleted":
                raise Exception("Asset not found or deleted.")
                
            storage_path = asset["storage_path"]
            file_name = asset["file_name"]
            
            # File extension
            ext = os.path.splitext(file_name)[1].lower().strip(".")
            
            # Extract text & metadata
            from app.services.extraction_service import ExtractionService
            metadata_res = ExtractionService.extract_metadata_and_text(storage_path, ext)
            extracted_text = metadata_res["text"]
            
            # Update asset metadata in DB
            await asset_repo.collection.update_one(
                {"_id": asset_id},
                {"$set": {
                    "word_count": metadata_res["word_count"],
                    "page_count": metadata_res["page_count"],
                    "estimated_read_time": metadata_res["estimated_read_time"],
                    "detected_topic": metadata_res["detected_topic"]
                }}
            )
            
            # 2. Update status to chunking
            logger.info(f"Job {job_id}. Step: chunking...")
            await ai_job_repo.update_status(job_id, "processing", progress=40, current_step="chunking")
            
            # Delete old chunks of this asset if regenerating
            from app.repositories.chunk_repo import chunk_repo
            await chunk_repo.delete_by_asset(asset_id)
            
            # Chunk and save
            from app.services.chunking_service import ChunkingService
            chunk_ids = await ChunkingService.process_and_store_chunks(asset_id, extracted_text)
            
            if not chunk_ids:
                raise Exception("Failed to chunk content or document was empty.")
                
            # 3. Update status to generating
            logger.info(f"Job {job_id}. Step: generating...")
            await ai_job_repo.update_status(job_id, "processing", progress=75, current_step="generating")
            
            # Fetch stored chunks from repo
            db_chunks = await chunk_repo.get_by_asset(asset_id)
            
            # Run AI Content Generation
            from app.services.ai_service import AIService
            ai_data = AIService.generate_content(db_chunks, norm_type, mode, asset.get("title", file_name))
            
            # 4. Update status to saving
            logger.info(f"Job {job_id}. Step: saving...")
            await ai_job_repo.update_status(job_id, "processing", progress=95, current_step="saving")
            
            # Handle AI versioning (Addition 11)
            from app.repositories.content_repo import generated_content_repo
            
            # Find latest version of this type for this asset
            prev_content = await generated_content_repo.get_latest_version(user_id, asset_id, norm_type)
            
            if prev_content:
                version = prev_content.get("version", 1) + 1
                parent_id = prev_content.get("parent_content_id") or prev_content["_id"]
            else:
                version = 1
                parent_id = None
                
            from bson import ObjectId
            content_id = str(ObjectId())
            
            # Save document
            content_doc = {
                "_id": content_id,
                "user_id": user_id,
                "asset_id": asset_id,
                "job_id": job_id,
                "content_type": norm_type,
                "title": asset.get("title", file_name),
                "version": version,
                "parent_content_id": parent_id,
                "generation_mode": mode,
                "data": ai_data,
                "source_chunk_ids": chunk_ids,
                "rating": None,
                "feedback": None,
                "created_at": datetime.now(timezone.utc)
            }
            
            await generated_content_repo.create_content(content_doc)
            
            # 5. Complete job
            logger.info(f"Job {job_id} completed successfully.")
            await ai_job_repo.update_status(job_id, "completed", result_id=content_id, progress=100, current_step="completed")
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            await ai_job_repo.update_status(job_id, "failed", progress=100, current_step="failed")
