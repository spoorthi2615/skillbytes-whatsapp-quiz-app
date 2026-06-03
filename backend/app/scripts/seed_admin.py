"""
Dev seed: creates a test student account for Sprint 1 verification.
Run: .\\venv\\Scripts\\python -m app.scripts.seed_admin
"""
import asyncio
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.core.security import hash_password, generate_verification_token

async def seed():
    await connect_to_mongo()
    db = get_database()

    test_users = [
        {
            "_id": str(ObjectId()),
            "name": "Test Student",
            "username": "teststudent",
            "email": "student@test.com",
            "password_hash": hash_password("Test@123"),
            "email_verified": True,
            "verification_token": None,
            "college": "ABC Engineering College",
            "branch": "Computer Science",
            "year": "3",
            "preferred_language": "Python",
            "role": "student",
            "xp": 0,
            "level": 1,
            "streak": 0,
            "last_active_at": datetime.now(timezone.utc),
            "is_active": True,
            "deleted_at": None,
            "created_at": datetime.now(timezone.utc)
        }
    ]

    for user in test_users:
        existing = await db["users"].find_one({"email": user["email"]})
        if existing:
            print(f"User {user['email']} already exists, skipping.")
        else:
            await db["users"].insert_one(user)
            print(f"Created user: {user['email']} / Test@123")

    await close_mongo_connection()
    print("Seed complete.")

if __name__ == "__main__":
    asyncio.run(seed())
