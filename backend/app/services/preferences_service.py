from app.repositories.preferences_repo import preferences_repo


class PreferencesService:

    @staticmethod
    async def get_preferences(user_id: str) -> dict:
        prefs = await preferences_repo.get_preferences(user_id)
        if not prefs:
            # Auto-create defaults if missing (handles legacy users)
            await preferences_repo.create_defaults(user_id)
            prefs = await preferences_repo.get_preferences(user_id)
        return PreferencesService._format(prefs)

    @staticmethod
    async def update_preferences(user_id: str, data: dict) -> dict:
        allowed = {"preferred_language", "theme", "notifications_enabled", "selected_tracks"}
        update_data = {k: v for k, v in data.items() if k in allowed and v is not None}
        await preferences_repo.upsert_preferences(user_id, update_data)
        return await PreferencesService.get_preferences(user_id)

    @staticmethod
    def _format(prefs: dict) -> dict:
        return {
            "preferred_language": prefs.get("preferred_language", "Python"),
            "theme": prefs.get("theme", "dark"),
            "notifications_enabled": prefs.get("notifications_enabled", True),
            "selected_tracks": prefs.get("selected_tracks", []),
        }
