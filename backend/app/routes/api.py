from fastapi import APIRouter, HTTPException
from app.services.exam_service import ExamService
from app.services.quiz_service import QuizService
from app.services.analytics_service import AnalyticsService
from app.schemas.domain import StartQuizRequest, AnswerRequest

router = APIRouter()

def success_response(data):
    return {"success": True, "data": data}

@router.get("/exams")
async def get_exams():
    exams = await ExamService.get_all_exams()
    return success_response(exams)

@router.get("/exams/{exam_id}/subjects")
async def get_subjects(exam_id: str):
    subjects = await ExamService.get_subjects_by_exam(exam_id)
    return success_response(subjects)

@router.get("/subjects/{subject_id}/chapters")
async def get_chapters(subject_id: str):
    chapters = await ExamService.get_chapters_by_subject(subject_id)
    return success_response(chapters)

@router.get("/chapters/{chapter_id}/questions")
async def get_questions(chapter_id: str):
    questions = await ExamService.get_questions_by_chapter(chapter_id)
    # Remove correct_option_id and explanation to not leak answers
    for q in questions:
        q.pop("correct_option_id", None)
        q.pop("explanation", None)
    return success_response(questions)

@router.post("/quiz/start")
async def start_quiz(request: StartQuizRequest):
    result = await QuizService.start_quiz(request)
    return success_response(result)

@router.post("/quiz/{session_id}/answer")
async def answer_question(session_id: str, request: AnswerRequest):
    try:
        result = await QuizService.submit_answer(session_id, request)
        return success_response(result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/quiz/{session_id}/complete")
async def complete_quiz(session_id: str):
    try:
        result = await QuizService.complete_quiz(session_id)
        return success_response(result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/analytics/dashboard")
async def get_analytics():
    metrics = await AnalyticsService.get_dashboard_metrics()
    return success_response(metrics)
