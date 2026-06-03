from app.repositories.xp_repo import xp_repo
from app.repositories.user_repo import user_repo
from app.services.achievement_service import AchievementService

XP_LEVELS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000]

class XPService:
    @staticmethod
    def calculate_level(xp: int) -> int:
        level = 1
        for i in range(len(XP_LEVELS)):
            if xp >= XP_LEVELS[i]:
                level = i + 1
            else:
                break
        return level

    @staticmethod
    async def award_xp(user_id: str, amount: int, reason: str, source_id: str = None):
        user = await user_repo.get_by_id(user_id)
        if not user: return False
        
        # Add to history
        await xp_repo.add_xp_entry(user_id, amount, reason, source_id)
        
        # Update user total
        new_xp = user.get("xp", 0) + amount
        new_level = XPService.calculate_level(new_xp)
        
        await user_repo.update_user(user_id, {"xp": new_xp, "level": new_level})
        
        # Check level up achievement? (Future logic)
        return {"new_xp": new_xp, "new_level": new_level}
        
    @staticmethod
    async def get_history(user_id: str):
        return await xp_repo.get_history(user_id)
