from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user

class RoleChecker:
    """FastAPI dependency for role-based access control.
    Usage: Depends(RoleChecker(['admin'])) or Depends(require_admin)
    """
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {self.allowed_roles}"
            )
        return current_user

# Pre-built instances for convenience
require_student = RoleChecker(["student", "faculty", "admin"])
require_faculty = RoleChecker(["faculty", "admin"])
require_admin = RoleChecker(["admin"])
