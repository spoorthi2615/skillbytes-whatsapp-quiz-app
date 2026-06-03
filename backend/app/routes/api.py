from fastapi import APIRouter, HTTPException
from app.services.exam_service import ExamService
from app.services.quiz_service import QuizService
from app.services.analytics_service import AnalyticsService
from app.schemas.domain import StartQuizRequest, AnswerRequest
from app.routes.auth_routes import router as auth_router
from app.routes.profile_routes import router as profile_router
from app.routes.preferences_routes import router as preferences_router
from app.routes.xp_routes import router as xp_router
from app.routes.achievement_routes import router as achievement_router
from app.routes.notification_routes import router as notification_router
from app.routes.track_routes import router as track_router
from app.routes.history_routes import router as history_router
from app.routes.recommendation_routes import router as recommendation_router
from app.routes.challenge_routes import router as challenge_router
from app.routes.asset_routes import router as asset_router
from app.routes.ai_job_routes import router as ai_job_router
from app.routes.content_routes import router as content_router
from app.routes.favorites_routes import router as favorites_router
from app.routes.session_routes import router as session_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(profile_router)
router.include_router(preferences_router)
router.include_router(xp_router)
router.include_router(achievement_router)
router.include_router(notification_router)
router.include_router(track_router)
router.include_router(history_router)
router.include_router(recommendation_router)
router.include_router(challenge_router)
router.include_router(asset_router)
router.include_router(ai_job_router)
router.include_router(content_router)
router.include_router(favorites_router)
router.include_router(session_router)

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
async def get_analytics(user_id: str = None):
    metrics = await AnalyticsService.get_dashboard_metrics(user_id)
    return success_response(metrics)
