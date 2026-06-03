from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request
from app.services.asset_service import AssetService
from app.core.security import get_current_user
from app.middleware.rate_limiter import limiter
import os
import re
import uuid
import shutil
from app.core.config import settings

router = APIRouter(prefix="/assets", tags=["assets"])

ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
}

def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename)
    name, ext = os.path.splitext(base)
    clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '', name)
    if not clean_name:
        clean_name = "uploaded_file"
    return f"{clean_name}_{uuid.uuid4().hex[:12]}{ext.lower()}"

@router.post("/upload")
@limiter.limit("5/minute")
async def upload_asset(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    # 1. Enforce user quota (< 100 assets)
    asset_count = len(await AssetService.list_assets(user_id))
    if asset_count >= 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User upload quota exceeded (maximum 100 files allowed)."
        )
        
    # 2. Validate file extension
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension: {ext}. Allowed: {list(ALLOWED_EXTENSIONS)}"
        )
        
    # 3. Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported MIME type: {file.content_type}. Allowed: {list(ALLOWED_MIME_TYPES)}"
        )
        
    # 4. Validate file size (25MB)
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.max_upload_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size limit of {settings.max_upload_size / (1024*1024):.1f} MB."
        )
        
    # 5. Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    
    # 6. Sanitize filename
    safe_name = sanitize_filename(file.filename)
    dest_path = os.path.join(settings.upload_dir, safe_name)
    
    # 7. Write file to disk
    try:
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to storage: {str(e)}"
        )
        
    # 8. Create metadata record
    metadata = {
        "title": os.path.splitext(file.filename)[0],
        "file_name": file.filename,
        "storage_path": dest_path,
        "mime_type": file.content_type,
        "file_size": file_size,
        "type": "material"
    }
    
    asset_id = await AssetService.create_asset_record(user_id, metadata)
    return {
        "success": True,
        "data": {
            "id": asset_id,
            "title": metadata["title"],
            "file_name": metadata["file_name"],
            "file_size": metadata["file_size"],
            "detected_topic": "Pending Extraction",
            "status": "uploaded"
        }
    }

@router.get("")
async def get_assets(current_user: dict = Depends(get_current_user)):
    assets = await AssetService.list_assets(current_user["_id"])
    return {"success": True, "data": assets}

@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    success = await AssetService.delete_asset(asset_id, current_user["_id"])
    return {"success": success}
