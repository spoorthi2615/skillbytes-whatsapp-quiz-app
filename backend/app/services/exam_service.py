from app.repositories.quiz_repo import exam_repo, subject_repo, chapter_repo, question_repo

class ExamService:
    @staticmethod
    async def get_all_exams():
        return await exam_repo.get_all()

    @staticmethod
    async def get_subjects_by_exam(exam_id: str):
        return await subject_repo.get_all({"exam_id": exam_id})

    @staticmethod
    async def get_chapters_by_subject(subject_id: str):
        return await chapter_repo.get_all({"subject_id": subject_id})

    @staticmethod
    async def get_questions_by_chapter(chapter_id: str):
        return await question_repo.get_all({"chapter_id": chapter_id})
