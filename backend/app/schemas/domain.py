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
