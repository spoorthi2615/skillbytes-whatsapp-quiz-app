import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from app.core.config import settings
from bson import ObjectId

async def seed_data():
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    
    # Clean up existing data
    await db.exams.delete_many({})
    await db.subjects.delete_many({})
    await db.chapters.delete_many({})
    await db.questions.delete_many({})
    
    print("Clearing collections...")
    
    exam_id = str(ObjectId())
    await db.exams.insert_one({
        "_id": exam_id,
        "name": "Software Engineering Interview",
        "description": "Test your software engineering knowledge",
        "icon": "Code"
    })
    
    subject_id = str(ObjectId())
    await db.subjects.insert_one({
        "_id": subject_id,
        "exam_id": exam_id,
        "name": "System Design",
        "description": "System Design principles and patterns"
    })
    
    chapter_id = str(ObjectId())
    await db.chapters.insert_one({
        "_id": chapter_id,
        "subject_id": subject_id,
        "name": "Microservices",
        "description": "Microservices architecture patterns"
    })
    
    await db.questions.insert_many([
        {
            "_id": str(ObjectId()),
            "chapter_id": chapter_id,
            "question_text": "What is the primary advantage of a microservices architecture over a monolithic architecture?",
            "options": [
                {"id": "a", "text": "Independent deployment and scaling"},
                {"id": "b", "text": "Easier to test end-to-end"},
                {"id": "c", "text": "Reduced network latency"},
                {"id": "d", "text": "Simpler database transactions"}
            ],
            "correct_option_id": "a",
            "explanation": "Microservices allow teams to deploy and scale services independently."
        },
        {
            "_id": str(ObjectId()),
            "chapter_id": chapter_id,
            "question_text": "Which pattern is commonly used for distributed transactions in microservices?",
            "options": [
                {"id": "a", "text": "Saga pattern"},
                {"id": "b", "text": "Two-phase commit (2PC)"},
                {"id": "c", "text": "Singleton pattern"},
                {"id": "d", "text": "Observer pattern"}
            ],
            "correct_option_id": "a",
            "explanation": "The Saga pattern manages distributed transactions by a sequence of local transactions."
        }
    ])
    
    print("Dummy data seeded successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
