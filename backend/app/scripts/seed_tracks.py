import asyncio
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from app.core.config import settings

async def seed_tracks_and_challenges():
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    
    # 1. Clean and Seed Tracks
    await db.learning_tracks.delete_many({})
    print("Clearing learning_tracks...")
    
    tracks = [
        {
            "_id": "track_placement",
            "title": "Placement Preparation",
            "description": "Master Coding, DSA, and System Design for top tech companies.",
            "icon": "💼",
            "order": 1,
            "is_active": True,
            "modules": [
                {"title": "Data Structures Basics", "xp": 100},
                {"title": "Algorithms Mastery", "xp": 150},
                {"title": "System Design Fundamentals", "xp": 200}
            ]
        },
        {
            "_id": "track_cyber",
            "title": "Cybersecurity Specialist",
            "description": "Learn network security, cryptography, and penetration testing.",
            "icon": "🛡️",
            "order": 2,
            "is_active": True,
            "modules": [
                {"title": "Networking Essentials", "xp": 100},
                {"title": "Cryptography Foundations", "xp": 150},
                {"title": "Web Security & OWASP Top 10", "xp": 200}
            ]
        },
        {
            "_id": "track_dev",
            "title": "Full-Stack Development",
            "description": "Build premium web applications with React, Node.js, and MongoDB.",
            "icon": "🌐",
            "order": 3,
            "is_active": True,
            "modules": [
                {"title": "Frontend Basics", "xp": 100},
                {"title": "Backend Architecture", "xp": 150},
                {"title": "Deployment & DevOps", "xp": 200}
            ]
        },
        {
            "_id": "track_ai",
            "title": "Artificial Intelligence & ML",
            "description": "Deep dive into Neural Networks, Natural Language Processing, and Computer Vision.",
            "icon": "🤖",
            "order": 4,
            "is_active": True,
            "modules": [
                {"title": "Python for Data Science", "xp": 100},
                {"title": "Supervised Learning", "xp": 150},
                {"title": "Deep Learning & Neural Networks", "xp": 250}
            ]
        }
    ]
    await db.learning_tracks.insert_many(tracks)
    print(f"Seeded {len(tracks)} learning tracks.")
    
    # 2. Seed Daily Challenges (For today, yesterday, and next 7 days)
    await db.daily_challenges.delete_many({})
    print("Clearing daily_challenges...")
    
    now = datetime.now(timezone.utc)
    challenges = []
    
    challenge_templates = [
        ("Data Structures Challenge", "Complete the Sorting Algorithms quiz with at least 80% accuracy.", 100),
        ("Systems Architecture Challenge", "Finish the VPC & Networking compute quiz under 3 minutes.", 150),
        ("ML Engineering Sprint", "Read the NumPy Operations module and complete the evaluation quiz.", 120),
        ("Security Hardening Task", "Find and secure the vulnerability in the OWASP module.", 200),
        ("Database Optimization Sprint", "Complete the Caching Strategies module with a perfect score.", 180),
        ("DevOps Deployment Sprint", "Configure and deploy a Docker container in the deployment sandbox.", 160)
    ]
    
    for i in range(-1, 8):
        date_str = (now + timedelta(days=i)).strftime("%Y-%m-%d")
        title, desc, xp = challenge_templates[(i + 1) % len(challenge_templates)]
        challenges.append({
            "_id": f"challenge_{date_str}",
            "date_str": date_str,
            "title": title,
            "description": desc,
            "xp_reward": xp,
            "created_at": now
        })
        
    await db.daily_challenges.insert_many(challenges)
    print(f"Seeded {len(challenges)} daily challenges.")
    
    client.close()
    print("Seed tracks and challenges complete.")

if __name__ == "__main__":
    asyncio.run(seed_tracks_and_challenges())
