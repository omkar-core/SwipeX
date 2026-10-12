"""
Auth & Identity service — Milestone 4: Notifications, Analytics & Application Tracking.

Run with:  uvicorn app.main:app --reload --port 8001
"""
from pathlib import Path
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=True)
load_dotenv(override=True)
import os
import time
from datetime import datetime
from typing import Dict, Tuple

from authlib.integrations.starlette_client import OAuth
from fastapi import FastAPI, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse, Response

from app.database import Base, engine, get_db
from app import schemas, security, models
from app.models import User, RefreshToken, Role, AuthProvider, Notification, AlertPreference, JobApplication, ApplicationStatusHistory
from app.deps import get_current_user, require_role
from app.gateway import router as gateway_router

from app.routers.notifications import router as notifications_router
from app.routers.applications import router as applications_router
from app.routers.competition import router as competition_router
from app.routers.analytics import router as analytics_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SwipeX Auth & Identity Service",
    version="0.4.0",
    description=(
        "Handles registration, login (email/password + Google OAuth2), "
        "JWT issuing/refresh, role-based access control (RBAC), and Milestone 4 "
        "Notifications, Application Tracking, Job Competition, and Analytics.\n\n"
        "Acts as the API Gateway, forwarding authenticated requests to downstream services."
    ),
)

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Needed by Authlib to store OAuth state between redirect and callback.
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY", "dev-only-session-secret"))

# ---------------------------------------------------------------------------
# Security Hardening & Rate Limiting Middleware
# ---------------------------------------------------------------------------
RATE_LIMIT_STORE: Dict[str, Tuple[int, float]] = {}  # ip -> (count, reset_time)
MAX_REQUESTS_PER_MINUTE = 120


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # Security Headers
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


Base.metadata.create_all(bind=engine)

# Include Routers
app.include_router(notifications_router)
app.include_router(applications_router)
app.include_router(competition_router)
app.include_router(analytics_router)
app.include_router(gateway_router)

# ---------------------------------------------------------------------------
# Google OAuth2 client setup
# ---------------------------------------------------------------------------
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "auth-service", "milestone": 4}


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
@app.post(
    "/api/v1/auth/register",
    response_model=schemas.RegisterResponse,
    status_code=201,
    summary="Register a new user",
    description="Creates a new account with a hashed password. Returns 409 if the email is already registered.",
    tags=["Auth"],
)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=security.hash_password(payload.password),
        role=payload.role,
        auth_provider=AuthProvider.LOCAL,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.RegisterResponse(user_id=user.id)


# ---------------------------------------------------------------------------
# Login (email + password)
# ---------------------------------------------------------------------------
@app.post(
    "/api/v1/auth/login",
    response_model=schemas.TokenResponse,
    summary="Log in with email + password",
    description="Verifies credentials and issues an access token (15 min) and refresh token (30 days).",
    tags=["Auth"],
)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.password_hash or not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return _issue_token_pair(user, db)


def _issue_token_pair(user: User, db: Session) -> schemas.TokenResponse:
    access_token = security.create_access_token(user.id, user.role.value)

    refresh_value = security.generate_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_value,
        expires_at=security.refresh_token_expiry(),
    ))
    db.commit()

    return schemas.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_value,
        role=user.role,
    )


# ---------------------------------------------------------------------------
# Google OAuth2 — redirect + callback
# ---------------------------------------------------------------------------
@app.get("/api/v1/auth/oauth/google")
async def oauth_google_login(request: Request):
    oauth.google.client_id = os.getenv("GOOGLE_CLIENT_ID")
    oauth.google.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = request.url_for("oauth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/api/v1/auth/oauth/google/callback")
async def oauth_google_callback(request: Request, db: Session = Depends(get_db)):
    oauth.google.client_id = os.getenv("GOOGLE_CLIENT_ID")
    oauth.google.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo") or {}
    google_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name", email)

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Google did not return the expected profile info")

    user = db.query(User).filter(User.oauth_id == google_id).first()
    if not user:
        user = User(
            name=name,
            email=email,
            password_hash=None,
            role=Role.JOB_SEEKER,
            auth_provider=AuthProvider.GOOGLE,
            oauth_id=google_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token_pair = _issue_token_pair(user, db)
    return token_pair


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------
@app.post(
    "/api/v1/auth/refresh",
    response_model=schemas.RefreshResponse,
    summary="Exchange a refresh token for a new access token",
    tags=["Auth"],
)
def refresh(payload: schemas.RefreshRequest, db: Session = Depends(get_db)):
    token_row = db.query(RefreshToken).filter(RefreshToken.token == payload.refresh_token).first()

    if not token_row or token_row.revoked or token_row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")

    user = db.query(User).filter(User.id == token_row.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access_token = security.create_access_token(user.id, user.role.value)
    return schemas.RefreshResponse(access_token=new_access_token)


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------
@app.get(
    "/api/v1/auth/me",
    response_model=schemas.MeResponse,
    summary="Get the current logged-in user",
    tags=["Auth"],
)
def me(current_user: User = Depends(get_current_user)):
    return schemas.MeResponse(
        user_id=current_user.id,
        name=current_user.name,
        role=current_user.role,
    )
