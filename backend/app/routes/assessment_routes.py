from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.assessment_service import AssessmentService
from app.services.ai_job_service import AIJobService
from app.core.security import get_current_user
from app.repositories.concept_mastery_repo import concept_mastery_repo
from app.repositories.question_repo import question_repo

router = APIRouter(prefix="/assessments", tags=["assessments"])

class GenerateAssessmentRequest(BaseModel):
    asset_id: str
    title: Optional[str] = None
    template_name: Optional[str] = None # Quick Quiz, Placement Prep, etc.
    question_count: Optional[int] = 10
    question_types: Optional[List[str]] = ["mcq"]
    difficulty: Optional[str] = "medium"
    generation_mode: Optional[str] = "Exam Preparation"

class SubmitAnswersRequest(BaseModel):
    answers: Dict[str, Any] # question_id -> student answer
    duration_ms: int

class CodingSubmissionRequest(BaseModel):
    question_id: str
    language: str
    solution: str

def success(data):
    return {"success": True, "data": data}

@router.post("/generate")
async def generate_assessment(
    body: GenerateAssessmentRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    # Predefined template mapping (Addition 1)
    from app.services.question_generation_service import TEMPLATES
    options = body.dict()
    
    if body.template_name and body.template_name in TEMPLATES:
        template = TEMPLATES[body.template_name]
        options["question_count"] = template["question_count"]
        options["question_types"] = template["question_types"]
        options["difficulty"] = template["difficulty"]
        
    job_id = await AssessmentService.create_assessment_job(user_id, body.asset_id, options)
    
    # Run processing asynchronously
    background_tasks.add_task(AIJobService.process_job, job_id)
    
    return success({
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "current_step": "upload"
    })

@router.get("")
async def get_assessments(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    assessments = await AssessmentService.get_assessments_dashboard(user_id)
    return success(assessments)

@router.get("/mastery")
async def get_mastery(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    mastery = await concept_mastery_repo.get_by_user(user_id)
    return success(mastery)

@router.post("/coding/submit")
async def submit_coding_draft(
    body: CodingSubmissionRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    from app.repositories.coding_submission_repo import coding_submission_repo
    sub_id = await coding_submission_repo.save_submission(
        user_id=user_id,
        question_id=body.question_id,
        language=body.language,
        solution=body.solution
    )
    return success({"submission_id": sub_id})

@router.get("/{id}")
async def get_assessment_details(id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    details = await AssessmentService.get_assessment_details(id, user_id)
    return success(details)

@router.post("/{id}/submit")
async def submit_assessment(
    id: str,
    body: SubmitAnswersRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    result = await AssessmentService.submit_answers(
        assessment_id=id,
        user_id=user_id,
        user_answers=body.answers,
        duration_ms=body.duration_ms
    )
    return success(result)



@router.get("/{id}/export")
async def export_assessment(id: str, current_user: dict = Depends(get_current_user)):
    # Export assessment in JSON/Markdown format (Addition 5)
    details = await AssessmentService.get_assessment_details(id, current_user["_id"])
    assessment = details["assessment"]
    questions = details["questions"]
    
    # Generate markdown format
    md_content = f"# Assessment: {assessment.get('title')}\n"
    md_content += f"Difficulty: {assessment.get('difficulty')} | Est. Duration: {assessment.get('estimated_duration')} minutes\n\n"
    
    for i, q in enumerate(questions):
        md_content += f"## Question {i+1} ({q.get('question_type').upper()})\n"
        md_content += f"{q.get('question')}\n\n"
        if q.get("options"):
            for opt in q["options"]:
                md_content += f"- {opt}\n"
            md_content += "\n"
        md_content += f"**Correct Answer:** {q.get('correct_answer')}\n\n"
        md_content += f"**Explanation:** {q.get('explanation')}\n\n"
        md_content += f"**Concept Tags:** {', '.join(q.get('concept_tags', []))}\n"
        md_content += "---\n\n"
        
    return success({
        "assessment": assessment,
        "questions": questions,
        "markdown": md_content
    })
