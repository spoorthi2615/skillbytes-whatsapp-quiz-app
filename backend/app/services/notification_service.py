from app.repositories.notification_repo import notification_repo

class NotificationService:
    @staticmethod
    async def get_feed(user_id: str):
        return await notification_repo.get_user_notifications(user_id)

    @staticmethod
    async def mark_read(notification_id: str, user_id: str):
        return await notification_repo.mark_as_read(notification_id, user_id)

    @staticmethod
    async def mark_all_read(user_id: str):
        return await notification_repo.mark_all_as_read(user_id)
        
    @staticmethod
    async def send_notification(user_id: str, title: str, message: str, type: str = "system"):
        return await notification_repo.create_notification(user_id, title, message, type)
