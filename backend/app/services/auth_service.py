from datetime import datetime, timedelta, timezone
from bson import ObjectId
from fastapi import HTTPException, status
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, generate_verification_token
)
from app.core.config import settings
from app.repositories.user_repo import user_repo
from app.repositories.token_repo import token_repo
from app.schemas.domain import RegisterRequest, LoginRequest


class AuthService:

    @staticmethod
    async def register(request: RegisterRequest) -> dict:
        # Check unique email
        if await user_repo.get_by_email(request.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        # Check unique username
        if await user_repo.get_by_username(request.username):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

        verification_token = generate_verification_token()
        now = datetime.now(timezone.utc)
        user_id = str(ObjectId())

        user_doc = {
            "_id": user_id,
            "name": request.name,
            "username": request.username.lower(),
            "email": request.email.lower(),
            "password_hash": hash_password(request.password),
            "email_verified": False,
            "verification_token": verification_token,
            "college": request.college,
            "branch": request.branch,
            "year": request.year,
            "preferred_language": request.preferred_language,
            "role": "student",
            "xp": 0,
            "level": 1,
            "streak": 0,
            "last_active_at": now,
            "is_active": True,
            "deleted_at": None,
            "created_at": now
        }
        await user_repo.create_user(user_doc)

        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})

        # Store refresh token in DB
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
        await token_repo.store_token(user_id, refresh_token, expires_at)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "verification_token": verification_token,  # In prod, email this — for dev, return it
            "user": AuthService._public_user(user_doc)
        }

    @staticmethod
    async def login(request: LoginRequest) -> dict:
        user = await user_repo.get_by_email(request.email)
        if not user or not verify_password(request.password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if not user.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
        # NOTE: email_verified check is lenient in dev — uncomment below for strict mode
        # if not user.get("email_verified", False):
        #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

        access_token = create_access_token({"sub": user["_id"]})
        refresh_token = create_refresh_token({"sub": user["_id"]})

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
        await token_repo.store_token(user["_id"], refresh_token, expires_at)
        await user_repo.update_last_active(user["_id"])

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": AuthService._public_user(user)
        }

    @staticmethod
    async def logout(refresh_token: str) -> dict:
        await token_repo.revoke_token(refresh_token)
        return {"message": "Logged out successfully"}

    @staticmethod
    async def refresh_access_token(refresh_token_str: str) -> dict:
        # Validate JWT
        payload = decode_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        # Check DB record
        stored = await token_repo.get_token(refresh_token_str)
        if not stored:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked or not found")
        if stored["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            await token_repo.revoke_token(refresh_token_str)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

        user_id = payload["sub"]
        new_access = create_access_token({"sub": user_id})
        new_refresh = create_refresh_token({"sub": user_id})

        new_expires = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
        await token_repo.rotate_token(refresh_token_str, new_refresh, new_expires)

        return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}

    @staticmethod
    async def get_me(user: dict) -> dict:
        return AuthService._public_user(user)

    @staticmethod
    async def verify_email(token: str) -> dict:
        from app.core.database import get_database
        db = get_database()
        user = await db["users"].find_one({"verification_token": token})
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        await user_repo.set_email_verified(user["_id"])
        return {"message": "Email verified successfully"}

    @staticmethod
    async def resend_verification(email: str) -> dict:
        user = await user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.get("email_verified"):
            return {"message": "Email already verified"}
        new_token = generate_verification_token()
        await user_repo.set_verification_token(user["_id"], new_token)
        # TODO: Send email via provider (SendGrid/SES) — currently returns token for dev
        return {"message": "Verification email sent", "verification_token": new_token}

    @staticmethod
    def _public_user(user: dict) -> dict:
        return {
            "id": user["_id"],
            "name": user.get("name", ""),
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "college": user.get("college", ""),
            "branch": user.get("branch", ""),
            "year": user.get("year", ""),
            "preferred_language": user.get("preferred_language", "Python"),
            "role": user.get("role", "student"),
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0),
            "email_verified": user.get("email_verified", False),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", "").isoformat() if user.get("created_at") else ""
        }
