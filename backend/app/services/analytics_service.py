from app.repositories.quiz_repo import session_repo, event_repo
from datetime import datetime, timedelta, timezone

class AnalyticsService:
    @staticmethod
    async def get_dashboard_metrics(user_id: str = None):
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        # Base match for user-specific queries
        user_match = {"user_id": user_id} if user_id else {}
        session_match = {"user_id": user_id} if user_id else {}

        # DAU: Count unique users in the last 24 hours
        dau_pipeline = [
            {"$match": {"started_at": {"$gte": today_start}, **session_match}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "dau"}
        ]
        dau_res = await session_repo.aggregate(dau_pipeline)
        dau = dau_res[0]["dau"] if dau_res else 0

        # WAU: Count unique users in the last 7 days
        wau_pipeline = [
            {"$match": {"started_at": {"$gte": week_start}, **session_match}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "wau"}
        ]
        wau_res = await session_repo.aggregate(wau_pipeline)
        wau = wau_res[0]["wau"] if wau_res else 0

        # Completion Rate & Questions Logic
        # Answered <= Served by pulling from sessions which track total_questions
        session_stats_pipeline = [
            {"$match": session_match},
            {"$group": {
                "_id": None,
                "total_sessions": {"$sum": 1},
                "completed_sessions": {"$sum": {"$cond": [{"$ne": ["$completed_at", None]}, 1, 0]}},
                "total_questions_in_sessions": {"$sum": "$total_questions"},
                "total_score": {"$sum": "$score"}
            }}
        ]
        s_stats = await session_repo.aggregate(session_stats_pipeline)
        total_sessions = s_stats[0]["total_sessions"] if s_stats else 0
        completed_sessions = s_stats[0]["completed_sessions"] if s_stats else 0
        total_questions = s_stats[0]["total_questions_in_sessions"] if s_stats else 0
        total_correct = s_stats[0]["total_score"] if s_stats else 0

        completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        # Average Response Time & Total Answered
        events_pipeline = [
            {"$match": {"event_type": "question_answered", **user_match}},
            {"$group": {
                "_id": None,
                "avg_time": {"$avg": "$duration_ms"},
                "answered": {"$sum": 1}
            }}
        ]
        events_res = await event_repo.aggregate(events_pipeline)
        avg_response_time = events_res[0]["avg_time"] if events_res else 0
        questions_answered = events_res[0]["answered"] if events_res else 0

        # Enforce Answered <= Total (Served) logic mathematically
        questions_served = max(total_questions, questions_answered)
        
        accuracy = (total_correct / questions_answered * 100) if questions_answered > 0 else 0

        # Drop-off Analysis (Abandonment Index)
        dropoff_pipeline = [
            {"$match": {"completed_at": None, **session_match}},
            {"$group": {"_id": "$current_question_index", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        dropoff_res = await session_repo.aggregate(dropoff_pipeline)
        dropoff_data = [{"question_index": f"Q{doc['_id'] + 1}", "dropoffs": doc["count"]} for doc in dropoff_res]

        # Peak Activity Hours
        peak_hours_pipeline = [
            {"$match": session_match},
            {"$project": {"hour": {"$hour": "$started_at"}}},
            {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        peak_hours_res = await session_repo.aggregate(peak_hours_pipeline)
        peak_hours_dict = {h: 0 for h in range(24)}
        for doc in peak_hours_res:
            if doc["_id"] is not None:
                peak_hours_dict[doc["_id"]] = doc["count"]
        
        full_peak_hours = [{"hour": f"{h:02d}:00", "activity": peak_hours_dict[h]} for h in range(24)]

        avg_questions_per_session = (questions_answered / total_sessions) if total_sessions > 0 else 0

        return {
            "daily_active_users": dau,
            "weekly_active_users": wau,
            "questions_served": questions_served,
            "questions_answered": questions_answered,
            "average_response_time_ms": avg_response_time,
            "quiz_completion_rate": min(completion_rate, 100.0),
            "accuracy": min(accuracy, 100.0),
            "total_attempts": total_sessions,
            "avg_questions_per_session": avg_questions_per_session,
            "drop_off_data": dropoff_data,
            "peak_hours_data": full_peak_hours
        }
