from fastapi import HTTPException
from app.repositories.user_repo import user_repo


class ProfileService:

    @staticmethod
    async def get_profile(user_id: str) -> dict:
        user = await user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return ProfileService._format_profile(user)

    @staticmethod
    async def update_profile(user_id: str, data: dict) -> dict:
        # Only allow updating these specific fields
        allowed = {"name", "college", "branch", "year", "preferred_language"}
        update_data = {k: v for k, v in data.items() if k in allowed and v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        updated = await user_repo.update_user(user_id, update_data)
        if not updated:
            raise HTTPException(status_code=404, detail="User not found or no changes made")

        # Return the refreshed profile
        user = await user_repo.get_by_id(user_id)
        return ProfileService._format_profile(user)

    @staticmethod
    async def get_public_profile(username: str) -> dict:
        user = await user_repo.get_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not user.get("is_active", True):
            raise HTTPException(status_code=404, detail="User not found")
        # Return only public-safe fields
        created_at = user.get("created_at", "")
        return {
            "username": user.get("username", ""),
            "name": user.get("name", ""),
            "level": user.get("level", 1),
            "xp": user.get("xp", 0),
            "streak": user.get("streak", 0),
            "college": user.get("college", ""),
            "branch": user.get("branch", ""),
            "role": user.get("role", "student"),
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        }

    @staticmethod
    def _format_profile(user: dict) -> dict:
        created_at = user.get("created_at", "")
        last_active_at = user.get("last_active_at", "")
        return {
            "id": user["_id"],
            "name": user.get("name", ""),
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "college": user.get("college", ""),
            "branch": user.get("branch", ""),
            "year": user.get("year", ""),
            "preferred_language": user.get("preferred_language", "Python"),
            "role": user.get("role", "student"),
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0),
            "email_verified": user.get("email_verified", False),
            "is_active": user.get("is_active", True),
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
            "last_active_at": last_active_at.isoformat() if hasattr(last_active_at, "isoformat") else str(last_active_at),
        }
