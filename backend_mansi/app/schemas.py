from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models import Role, NotificationType, NotificationChannel, ApplicationStatus


# ---------------------------------------------------------------------------
# Auth Schemas
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role = Role.JOB_SEEKER


class RegisterResponse(BaseModel):
    user_id: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    role: Role


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str


class MeResponse(BaseModel):
    user_id: str
    name: str
    role: Role


# ---------------------------------------------------------------------------
# Notification Schemas (Milestone 4)
# ---------------------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: NotificationType
    channel: NotificationChannel
    is_read: bool
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int


class AlertPreferenceRequest(BaseModel):
    instant_job: Optional[bool] = None
    startup_hiring: Optional[bool] = None
    high_match: Optional[bool] = None
    low_competition: Optional[bool] = None
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    match_threshold: Optional[str] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class AlertPreferenceResponse(BaseModel):
    id: str
    user_id: str
    instant_job: bool
    startup_hiring: bool
    high_match: bool
    low_competition: bool
    email_enabled: bool
    push_enabled: bool
    in_app_enabled: bool
    match_threshold: str
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class TriggerNotificationRequest(BaseModel):
    user_id: str
    title: str
    message: str
    type: NotificationType = NotificationType.SYSTEM
    channel: NotificationChannel = NotificationChannel.IN_APP
    metadata: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Application Tracking Schemas (Milestone 4)
# ---------------------------------------------------------------------------
class CreateApplicationRequest(BaseModel):
    job_id: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.APPLIED
    notes: Optional[str] = None


class UpdateApplicationStatusRequest(BaseModel):
    status: ApplicationStatus
    notes: Optional[str] = None


class ApplicationHistoryResponse(BaseModel):
    id: str
    application_id: str
    previous_status: Optional[str] = None
    new_status: str
    changed_by_user_id: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    job_id: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    status: ApplicationStatus
    notes: Optional[str] = None
    applied_at: datetime
    updated_at: datetime
    history: List[ApplicationHistoryResponse] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Job Competition Schemas (Milestone 4)
# ---------------------------------------------------------------------------
class CompetitionInfoResponse(BaseModel):
    job_id: str
    applicant_count: int
    competition_level: str  # "Low", "Medium", "High"
    early_applicant: bool
    posted_time: str


class CompetitionBatchResponse(BaseModel):
    competition: Dict[str, CompetitionInfoResponse]


# ---------------------------------------------------------------------------
# Analytics & Dashboard Schemas (Milestone 4)
# ---------------------------------------------------------------------------
class StatusFunnel(BaseModel):
    saved: int = 0
    applied: int = 0
    shortlisted: int = 0
    interview: int = 0
    rejected: int = 0


class JobSeekerAnalyticsResponse(BaseModel):
    total_applications: int
    funnel: StatusFunnel
    resume_performance: Dict[str, Any]
    skill_gaps: List[str]
    recommendation_insights: List[Dict[str, Any]]


class RecruiterAnalyticsResponse(BaseModel):
    total_posted_jobs: int
    total_applicants: int
    status_funnel: StatusFunnel
    applicants_per_job: List[Dict[str, Any]]
    application_trends: List[Dict[str, Any]]


class AdminAnalyticsResponse(BaseModel):
    total_users: int
    users_by_role: Dict[str, int]
    total_jobs: int
    total_applications: int
    status_distribution: Dict[str, int]
    system_health: Dict[str, Any]


class HiringTrendsResponse(BaseModel):
    jobs_posted_timeline: List[Dict[str, Any]]
    top_in_demand_skills: List[Dict[str, Any]]
    startup_vs_mnc_activity: Dict[str, Any]
