from fastapi import APIRouter, Depends
from app.services.auth_service import AuthService
from app.schemas.domain import RegisterRequest, LoginRequest, RefreshRequest, VerifyEmailRequest, ResendVerificationRequest
from app.core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

def ok(data):
    return {"success": True, "data": data}

@router.post("/register")
async def register(request: RegisterRequest):
    result = await AuthService.register(request)
    return ok(result)

@router.post("/login")
async def login(request: LoginRequest):
    result = await AuthService.login(request)
    return ok(result)

@router.post("/logout")
async def logout(request: RefreshRequest):
    result = await AuthService.logout(request.refresh_token)
    return ok(result)

@router.post("/refresh")
async def refresh(request: RefreshRequest):
    result = await AuthService.refresh_access_token(request.refresh_token)
    return ok(result)

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    result = await AuthService.get_me(current_user)
    return ok(result)

@router.post("/verify-email")
async def verify_email(request: VerifyEmailRequest):
    result = await AuthService.verify_email(request.token)
    return ok(result)

@router.post("/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    result = await AuthService.resend_verification(request.email)
    return ok(result)
