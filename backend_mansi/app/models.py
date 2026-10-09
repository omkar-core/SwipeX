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


class NotificationType(str, enum.Enum):
    INSTANT_JOB = "instant_job"
    STARTUP_HIRING = "startup_hiring"
    HIGH_MATCH = "high_match"
    LOW_COMPETITION = "low_competition"
    APPLICATION_STATUS = "application_status"
    SYSTEM = "system"


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"


class ApplicationStatus(str, enum.Enum):
    SAVED = "saved"
    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    REJECTED = "rejected"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(Enum(NotificationType), nullable=False, default=NotificationType.SYSTEM, index=True)
    channel = Column(Enum(NotificationChannel), nullable=False, default=NotificationChannel.IN_APP)
    is_read = Column(Boolean, default=False, index=True)
    metadata_json = Column(String, nullable=True)  # Stores JSON strings like job_id, app_id, match_score
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", backref="notifications")


class AlertPreference(Base):
    __tablename__ = "alert_preferences"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    instant_job = Column(Boolean, default=True)
    startup_hiring = Column(Boolean, default=True)
    high_match = Column(Boolean, default=True)
    low_competition = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    match_threshold = Column(String, default="70")  # threshold percentage e.g. 70
    quiet_hours_start = Column(String, nullable=True)  # e.g., "22:00"
    quiet_hours_end = Column(String, nullable=True)  # e.g., "08:00"
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="alert_preference")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(String, nullable=False, index=True)
    job_title = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    status = Column(Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.APPLIED, index=True)
    notes = Column(String, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="job_applications")
    history = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan")


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    application_id = Column(String, ForeignKey("job_applications.id"), nullable=False, index=True)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    changed_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("JobApplication", back_populates="history")

