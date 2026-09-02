"""
JWT + password hashing — Day 2 checklist: "JWT/OAuth2 approach decided"

Decision (documented here so the team doesn't have to guess later):
- Access token: short-lived JWT (15 min), signed HS256, carries {user_id, role}.
  Every other service verifies this signature independently — no network
  call back to Auth service needed per-request.
- Refresh token: long-lived random string, stored hashed in the DB
  (RefreshToken table) so it can be revoked. NOT a JWT — a JWT can't be
  revoked before it expires, which defeats the point of a refresh token.
- OAuth2 (Google): on successful Google login, we issue our OWN access +
  refresh token pair (same shape as local login) — downstream services
  never need to know whether the user logged in locally or via Google.
"""
import os
import secrets
from datetime import datetime, timedelta

from jose import jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "role": role, "exp": expire, "type": "access"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises jose.JWTError if invalid/expired — caller should catch and 401."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def generate_refresh_token() -> str:
    """Opaque random token — not a JWT, so it can be revoked server-side."""
    return secrets.token_urlsafe(48)


def refresh_token_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
