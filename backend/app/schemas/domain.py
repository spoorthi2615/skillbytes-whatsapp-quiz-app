from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class MongoBaseModel(BaseModel):
    id: str = Field(alias="_id")

class User(MongoBaseModel):
    created_at: datetime
    last_active_at: datetime

class Exam(MongoBaseModel):
    name: str
    description: str
    icon: str

class Subject(MongoBaseModel):
    exam_id: str
    name: str
    description: str

class Chapter(MongoBaseModel):
    subject_id: str
    name: str
    description: str

class Option(BaseModel):
    id: str
    text: str

class Question(MongoBaseModel):
    chapter_id: str
    question_text: str
    options: List[Option]
    correct_option_id: str
    explanation: Optional[str] = None

class QuizSession(MongoBaseModel):
    user_id: str
    chapter_id: str
    current_question_index: int = 0
    answers: dict = {}  # question_id -> selected_option_id
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: int = 0
    total_questions: int
    accuracy_percentage: float = 0.0

class QuizEvent(MongoBaseModel):
    session_id: str
    user_id: str
    question_id: str
    event_type: str
    shown_at: datetime
    answered_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    selected_option_id: Optional[str] = None
    is_correct: Optional[bool] = None

# Request / Response Schemas

class StartQuizRequest(BaseModel):
    user_id: str
    chapter_id: str
    total_questions: int  # Count of questions actually sampled and sent to the client

class AnswerRequest(BaseModel):
    question_id: str
    selected_option_id: str
    duration_ms: int

class QuizResultResponse(BaseModel):
    score: int
    total_questions: int
    accuracy_percentage: float
    correct_answers: int
    incorrect_answers: int

# ── Auth Schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    username: str
    email: str
    password: str
    college: str = ""
    branch: str = ""
    year: str = ""
    preferred_language: str = "Python"

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: str

class UserResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    college: str
    branch: str
    year: str
    preferred_language: str
    role: str
    xp: int
    level: int
    streak: int
    email_verified: bool
    is_active: bool
    created_at: datetime

# ── Profile & Preferences Schemas ────────────────────────────

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    preferred_language: Optional[str] = None

class PublicProfileResponse(BaseModel):
    username: str
    name: str
    level: int
    xp: int
    streak: int
    college: str
    branch: str
    role: str
    created_at: str

class UserPreferencesResponse(BaseModel):
    preferred_language: str
    theme: str
    notifications_enabled: bool
    selected_tracks: List[str]

class UpdatePreferencesRequest(BaseModel):
    preferred_language: Optional[str] = None
    theme: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    selected_tracks: Optional[List[str]] = None
