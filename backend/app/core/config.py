from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "skillbytes_db"
    cors_origins: str = "http://localhost:5173"
    jwt_secret_key: str = "changeme-use-a-real-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
