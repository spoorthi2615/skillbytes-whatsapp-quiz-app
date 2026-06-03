class RecommendationService:
    @staticmethod
    async def get_recommendations(user_id: str):
        # Placeholder static recommendation logic
        return [
            {
                "id": "rec_1",
                "title": "Continue Python basics",
                "description": "You left off at Lists and Tuples.",
                "type": "resume",
                "action_url": "/quiz/python_101"
            },
            {
                "id": "rec_2",
                "title": "Trending: Advanced Algorithms",
                "description": "500 students are taking this right now.",
                "type": "trending",
                "action_url": "/tracks"
            }
        ]
