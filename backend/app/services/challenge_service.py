from app.repositories.challenge_repo import challenge_repo

class ChallengeService:
    @staticmethod
    async def get_today(user_id: str):
        challenge = await challenge_repo.get_todays_challenge()
        is_completed = await challenge_repo.is_completed(user_id, challenge["_id"])
        challenge["is_completed"] = is_completed
        return challenge
