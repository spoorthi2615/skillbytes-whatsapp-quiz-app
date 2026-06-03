from datetime import datetime, timezone, timedelta
from app.repositories.user_repo import user_repo

class StreakService:
    @staticmethod
    async def update_streak(user_id: str):
        user = await user_repo.get_by_id(user_id)
        if not user: return 0
        
        now = datetime.now(timezone.utc)
        last_active = user.get("last_active_at")
        current_streak = user.get("streak", 0)
        
        if not last_active:
            new_streak = 1
        else:
            # Check if active today
            delta_days = (now.date() - last_active.date()).days
            if delta_days == 0:
                new_streak = current_streak # Already active today
            elif delta_days == 1:
                new_streak = current_streak + 1 # Active yesterday
            else:
                new_streak = 1 # Streak broken
                
        await user_repo.update_user(user_id, {"streak": new_streak, "last_active_at": now})
        return new_streak
