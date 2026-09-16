"""
Day 3 checklist: "Role rule (RBAC) added & tested"
Day 4 checklist: "RBAC enforced on protected routes"
Milestone 2 Day 2: optional auth for public browsing endpoints (GET /jobs,
/jobs/{id}, /jobs/search, /companies) — matches data_hanith's own
"Public / Optional Auth" contract: unauthenticated users can browse,
authenticated Job Seekers get personalized results (e.g. previously
swiped jobs excluded).

Three dependencies:
- get_current_user: decodes the Bearer token, confirms the user still
  exists, returns their id/role. Use on routes that REQUIRE login.
- get_optional_current_user: same, but returns None instead of raising
  if no/invalid token is given. Use on routes anyone can browse.
- require_role(*roles): wraps get_current_user and additionally checks
  the user's role is one of the allowed roles.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


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


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns the User if a valid token is given, otherwise None — never raises."""
    if credentials is None or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None

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
