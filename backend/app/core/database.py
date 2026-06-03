from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.mongodb_url)
    
    # Ensure indexes
    database = db.client[settings.database_name]
    try:
        await database["users"].create_index("email", unique=True)
        await database["users"].create_index("username", unique=True)
        await database["refresh_tokens"].create_index("token", unique=True)
    except Exception as e:
        from loguru import logger
        logger.warning(f"Could not create database indexes: {e}")

async def close_mongo_connection():
    if db.client:
        db.client.close()

def get_database():
    return db.client[settings.database_name]
