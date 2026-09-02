"""
Users & Roles schema — Day 2 checklist: "Users/Roles schema finalized"

Supports both email/password login and Google OAuth2 login against the
same User table, and encodes role directly on the user for RBAC checks
(no separate join table needed at this scale — Job Seeker / Recruiter / Admin
are fixed, small enumerations, not a dynamic permissions system).
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    JOB_SEEKER = "job_seeker"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class AuthProvider(str, enum.Enum):
    LOCAL = "local"     # email + password
    GOOGLE = "google"   # OAuth2


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)

    # Nullable because Google-OAuth users never set a local password
    password_hash = Column(String, nullable=True)

    role = Column(Enum(Role), nullable=False, default=Role.JOB_SEEKER, index=True)
    auth_provider = Column(Enum(AuthProvider), nullable=False, default=AuthProvider.LOCAL)

    # Populated only for Google-OAuth users; lets us match a returning OAuth
    # login back to the same account.
    oauth_id = Column(String, nullable=True, unique=True, index=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """
    Stored server-side so refresh tokens can be revoked (e.g. on logout /
    password change) — an access token alone can't be revoked before it
    expires, but a refresh token backed by a DB row can.
    """
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")
