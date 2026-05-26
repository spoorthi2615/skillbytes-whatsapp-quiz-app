from app.repositories.base import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

class ExamRepository(BaseRepository):
    def __init__(self):
        super().__init__("exams")

class SubjectRepository(BaseRepository):
    def __init__(self):
        super().__init__("subjects")

class ChapterRepository(BaseRepository):
    def __init__(self):
        super().__init__("chapters")

class QuestionRepository(BaseRepository):
    def __init__(self):
        super().__init__("questions")

class QuizSessionRepository(BaseRepository):
    def __init__(self):
        super().__init__("quiz_sessions")

class QuizEventRepository(BaseRepository):
    def __init__(self):
        super().__init__("quiz_events")

# Instantiate repositories
user_repo = UserRepository()
exam_repo = ExamRepository()
subject_repo = SubjectRepository()
chapter_repo = ChapterRepository()
question_repo = QuestionRepository()
session_repo = QuizSessionRepository()
event_repo = QuizEventRepository()
