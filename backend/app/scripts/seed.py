import asyncio
import random
import uuid
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
    await db.quiz_sessions.delete_many({})
    await db.quiz_events.delete_many({})
    
    print("Clearing collections...")
    
    exams_data = [
        {"name": "Software Engineering", "desc": "Master core software engineering principles", "icon": "Code"},
        {"name": "Data Science & ML", "desc": "Explore data, algorithms, and models", "icon": "Database"},
        {"name": "Cloud & DevOps", "desc": "Learn infrastructure, deployment, and scaling", "icon": "Cloud"}
    ]

    subjects_data = {
        "Software Engineering": ["System Design", "Algorithms", "Web Development"],
        "Data Science & ML": ["Python Data Analysis", "Machine Learning Basics", "Deep Learning"],
        "Cloud & DevOps": ["AWS Architecture", "Docker & Kubernetes", "CI/CD Pipelines"]
    }

    chapters_data = {
        "System Design": ["Microservices", "Caching Strategies", "Database Sharding"],
        "Algorithms": ["Sorting Algorithms", "Graph Traversal", "Dynamic Programming"],
        "Web Development": ["React Fundamentals", "Node.js Architecture", "CSS & Responsive Design"],
        "Python Data Analysis": ["Pandas Basics", "NumPy Operations", "Data Visualization"],
        "Machine Learning Basics": ["Linear Regression", "Decision Trees", "Model Evaluation"],
        "Deep Learning": ["Neural Networks", "CNNs", "RNNs"],
        "AWS Architecture": ["EC2 & Compute", "S3 & Storage", "VPC & Networking"],
        "Docker & Kubernetes": ["Containerization", "Pods & Services", "Helm Charts"],
        "CI/CD Pipelines": ["GitHub Actions", "Jenkins", "Deployment Strategies"]
    }

    # Templates for generating questions
    question_templates = [
        ("What is the primary advantage of {topic}?", "It provides {benefit}.", "It makes the code shorter.", "It removes the need for databases.", "It is required by all browsers."),
        ("Which of the following is a common use case for {topic}?", "{use_case}.", "Styling text.", "Encrypting passwords.", "Replacing the operating system."),
        ("What happens when {topic} fails?", "{failure_mode}.", "The internet shuts down.", "Nothing happens.", "The database is deleted."),
        ("How does {topic} improve performance?", "By {improvement}.", "By adding more memory.", "By writing less code.", "By slowing down the CPU."),
        ("Which tool is most commonly associated with {topic}?", "{tool}.", "Microsoft Word.", "Adobe Photoshop.", "Windows Media Player.")
    ]

    benefits = ["high availability and scaling", "better state management", "reduced network latency", "independent deployment", "fault tolerance"]
    use_cases = ["Distributed transactions", "State synchronization", "Load balancing", "Data persistence", "Session management"]
    failure_modes = ["The system falls back to a replica", "The user receives a 500 error", "Data might be lost if not committed", "A retry mechanism is triggered", "The circuit breaker opens"]
    improvements = ["caching frequently accessed data", "reducing payload size", "parallel execution", "optimizing database queries", "minimizing DOM repaints"]
    tools = ["Redis", "PostgreSQL", "Kafka", "Nginx", "RabbitMQ"]

    questions_to_insert = []
    
    for e_data in exams_data:
        exam_id = str(ObjectId())
        await db.exams.insert_one({
            "_id": exam_id,
            "name": e_data["name"],
            "description": e_data["desc"],
            "icon": e_data["icon"]
        })
        
        for subj_name in subjects_data[e_data["name"]]:
            subject_id = str(ObjectId())
            await db.subjects.insert_one({
                "_id": subject_id,
                "exam_id": exam_id,
                "name": subj_name,
                "description": f"Master the concepts of {subj_name}"
            })
            
            for chap_name in chapters_data[subj_name]:
                chapter_id = str(ObjectId())
                await db.chapters.insert_one({
                    "_id": chapter_id,
                    "subject_id": subject_id,
                    "name": chap_name,
                    "description": f"Deep dive into {chap_name}"
                })
                
                # Generate 8-12 questions per chapter
                num_questions = random.randint(8, 12)
                for _ in range(num_questions):
                    q_template = random.choice(question_templates)
                    
                    correct_text = ""
                    if "{benefit}" in q_template[1]: correct_text = q_template[1].format(benefit=random.choice(benefits))
                    elif "{use_case}" in q_template[1]: correct_text = q_template[1].format(use_case=random.choice(use_cases))
                    elif "{failure_mode}" in q_template[1]: correct_text = q_template[1].format(failure_mode=random.choice(failure_modes))
                    elif "{improvement}" in q_template[1]: correct_text = q_template[1].format(improvement=random.choice(improvements))
                    elif "{tool}" in q_template[1]: correct_text = q_template[1].format(tool=random.choice(tools))
                    else: correct_text = q_template[1]

                    difficulty = random.choice(["easy", "medium", "hard"])
                    
                    options = [
                        {"id": "a", "text": correct_text},
                        {"id": "b", "text": q_template[2]},
                        {"id": "c", "text": q_template[3]},
                        {"id": "d", "text": q_template[4]}
                    ]
                    
                    questions_to_insert.append({
                        "_id": str(ObjectId()),
                        "chapter_id": chapter_id,
                        "question_text": q_template[0].format(topic=chap_name),
                        "options": options,
                        "correct_option_id": "a", # Backend will shuffle this during fetch
                        "difficulty": difficulty,
                        "explanation": f"The correct answer involves {correct_text.lower()} because it is a fundamental property of {chap_name}."
                    })
                    
    await db.questions.insert_many(questions_to_insert)
    print(f"Dummy data seeded successfully! Inserted {len(questions_to_insert)} unique questions across 27 chapters.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
