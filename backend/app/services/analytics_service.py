from app.repositories.quiz_repo import session_repo, event_repo
from datetime import datetime, timedelta, timezone

class AnalyticsService:
    @staticmethod
    async def get_dashboard_metrics():
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        # DAU: Count unique users in the last 24 hours (or from start of today)
        dau_pipeline = [
            {"$match": {"started_at": {"$gte": today_start}}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "dau"}
        ]
        dau_res = await session_repo.aggregate(dau_pipeline)
        dau = dau_res[0]["dau"] if dau_res else 0

        # WAU: Count unique users in the last 7 days
        wau_pipeline = [
            {"$match": {"started_at": {"$gte": week_start}}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "wau"}
        ]
        wau_res = await session_repo.aggregate(wau_pipeline)
        wau = wau_res[0]["wau"] if wau_res else 0

        # Completion Rate
        completion_pipeline = [
            {"$group": {
                "_id": None,
                "total_sessions": {"$sum": 1},
                "completed_sessions": {"$sum": {"$cond": [{"$ne": ["$completed_at", None]}, 1, 0]}}
            }}
        ]
        comp_res = await session_repo.aggregate(completion_pipeline)
        completion_rate = 0
        if comp_res and comp_res[0]["total_sessions"] > 0:
            completion_rate = (comp_res[0]["completed_sessions"] / comp_res[0]["total_sessions"]) * 100

        # Average Response Time
        time_pipeline = [
            {"$match": {"event_type": "question_answered", "duration_ms": {"$ne": None}}},
            {"$group": {"_id": None, "avg_time": {"$avg": "$duration_ms"}}}
        ]
        time_res = await event_repo.aggregate(time_pipeline)
        avg_response_time = time_res[0]["avg_time"] if time_res else 0

        # Questions served & answered
        events_pipeline = [
            {"$group": {
                "_id": None,
                "served": {"$sum": {"$cond": [{"$eq": ["$event_type", "question_shown"]}, 1, 0]}},
                "answered": {"$sum": {"$cond": [{"$eq": ["$event_type", "question_answered"]}, 1, 0]}}
            }}
        ]
        events_res = await event_repo.aggregate(events_pipeline)
        questions_served = events_res[0]["served"] if events_res else 0
        questions_answered = events_res[0]["answered"] if events_res else 0

        return {
            "daily_active_users": dau,
            "weekly_active_users": wau,
            "questions_served": questions_served,
            "questions_answered": questions_answered,
            "average_response_time_ms": avg_response_time,
            "quiz_completion_rate": completion_rate
        }
