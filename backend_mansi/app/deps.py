"""
Day 3 checklist: "Role rule (RBAC) added & tested"
Day 4 checklist: "RBAC enforced on protected routes"

Two dependencies:
- get_current_user: decodes the Bearer token, confirms the user still
  exists, returns their id/role. Use this on any route that just needs
  "someone logged in".
- require_role(*roles): wraps get_current_user and additionally checks
  the user's role is one of the allowed roles. Use this on routes that
  are restricted to specific roles (e.g. only Recruiters can post jobs).
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_role(*allowed_roles: str):
    """
    Usage:  @app.post(..., dependencies=[Depends(require_role("admin"))])
    or:     current_user: User = Depends(require_role("recruiter", "admin"))
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {allowed_roles}",
            )
        return current_user
    return role_checker
