from app.repositories.achievement_repo import achievement_repo
from app.services.notification_service import NotificationService

# Static dictionary of all achievements
ACHIEVEMENTS = {
    "first_quiz": {"id": "first_quiz", "title": "First Blood", "description": "Complete your first quiz", "icon": "🎯", "xp_reward": 50},
    "streak_3": {"id": "streak_3", "title": "On Fire", "description": "Reach a 3-day streak", "icon": "🔥", "xp_reward": 100},
    "perfect_score": {"id": "perfect_score", "title": "Flawless Victory", "description": "Score 100% on a quiz", "icon": "⭐", "xp_reward": 200},
    "first_ai_assessment": {"id": "first_ai_assessment", "title": "Self Examiner", "description": "Complete your first AI Assessment", "icon": "📊", "xp_reward": 100},
    "perfect_ai_assessment": {"id": "perfect_ai_assessment", "title": "Assessment Ace", "description": "Score 100% on any AI Assessment", "icon": "🏆", "xp_reward": 300},
    "coding_master": {"id": "coding_master", "title": "Coding Master", "description": "Draft and submit a coding challenge solution", "icon": "💻", "xp_reward": 150},
    "interview_expert": {"id": "interview_expert", "title": "Interview Expert", "description": "Submit answers for interview preparation questions", "icon": "👔", "xp_reward": 150},
}

class AchievementService:
    @staticmethod
    async def get_all_definitions():
        return list(ACHIEVEMENTS.values())

    @staticmethod
    async def get_user_achievements(user_id: str):
        user_achievements = await achievement_repo.get_user_achievements(user_id)
        # Enrich with definitions
        result = []
        for ua in user_achievements:
            ach = ACHIEVEMENTS.get(ua["achievement_id"])
            if ach:
                result.append({**ua, "title": ach["title"], "description": ach["description"], "icon": ach["icon"]})
        return result

    @staticmethod
    async def check_and_unlock(user_id: str, achievement_id: str):
        """Checks if user has it; if not, unlocks it, sends notification and returns True."""
        ach = ACHIEVEMENTS.get(achievement_id)
        if not ach: return False
        
        has_it = await achievement_repo.has_achievement(user_id, achievement_id)
        if has_it: return False
        
        await achievement_repo.unlock_achievement(user_id, achievement_id)
        await NotificationService.send_notification(
            user_id, 
            f"Achievement Unlocked: {ach['title']}", 
            ach['description'], 
            "achievement"
        )
        return True
