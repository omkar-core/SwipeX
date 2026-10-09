import os
os.environ["DATABASE_URL"] = "sqlite:///./test_m4.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import models
from app.database import Base, engine, get_db
from app.models import User, Role, JobApplication, ApplicationStatus, Notification, NotificationType
from app.security import create_access_token


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def create_user(email: str, name: str, role: Role) -> User:
    from app.database import get_sessionmaker
    db = get_sessionmaker()()
    user = User(
        email=email,
        name=name,
        role=role,
        password_hash="hashed_pw_123",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def auth_header(user: User) -> dict:
    token = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Test Notifications
# ---------------------------------------------------------------------------
def test_notifications_flow():
    job_seeker = create_user("seeker@example.com", "Job Seeker", Role.JOB_SEEKER)
    headers = auth_header(job_seeker)

    # 1. Unread count initially 0
    res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    # 2. Trigger a notification
    res = client.post(
        "/api/v1/notifications/trigger",
        headers=headers,
        json={
            "user_id": job_seeker.id,
            "title": "High Match Job!",
            "message": "Found a 90% match Senior Developer job.",
            "type": "high_match",
            "channel": "in_app",
        },
    )
    assert res.status_code == 200
    notif_id = res.json()["id"]

    # 3. Unread count is now 1
    res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.json()["unread_count"] == 1

    # 4. List notifications
    res = client.get("/api/v1/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["title"] == "High Match Job!"

    # 5. Mark as read
    res = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_read"] is True

    # 6. Unread count back to 0
    res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.json()["unread_count"] == 0


def test_alert_preferences():
    job_seeker = create_user("pref@example.com", "Pref User", Role.JOB_SEEKER)
    headers = auth_header(job_seeker)

    # Get preferences
    res = client.get("/api/v1/notifications/preferences", headers=headers)
    assert res.status_code == 200
    assert res.json()["instant_job"] is True

    # Update preferences
    res = client.put(
        "/api/v1/notifications/preferences",
        headers=headers,
        json={"instant_job": False, "match_threshold": "85", "quiet_hours_start": "22:00", "quiet_hours_end": "08:00"},
    )
    assert res.status_code == 200
    assert res.json()["instant_job"] is False
    assert res.json()["match_threshold"] == "85"


# ---------------------------------------------------------------------------
# Test Application Tracking
# ---------------------------------------------------------------------------
def test_application_tracking_workflow():
    job_seeker = create_user("applicant@example.com", "Applicant", Role.JOB_SEEKER)
    recruiter = create_user("recruiter@example.com", "Recruiter", Role.RECRUITER)

    seeker_headers = auth_header(job_seeker)
    recruiter_headers = auth_header(recruiter)

    # 1. Apply to job
    res = client.post(
        "/api/v1/applications",
        headers=seeker_headers,
        json={"job_id": "job-55", "job_title": "Fullstack Engineer", "company_name": "Tech Corp"},
    )
    assert res.status_code == 201
    app_id = res.json()["id"]
    assert res.json()["status"] == "applied"

    # 2. Duplicate application returns 409
    res = client.post(
        "/api/v1/applications",
        headers=seeker_headers,
        json={"job_id": "job-55"},
    )
    assert res.status_code == 409

    # 3. Recruiter views applications and updates status to SHORTLISTED
    res = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers=recruiter_headers,
        json={"status": "shortlisted", "notes": "Impressive experience in Python"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "shortlisted"

    # 4. Job seeker checks application detail & timeline history
    res = client.get(f"/api/v1/applications/{app_id}", headers=seeker_headers)
    assert res.status_code == 200
    history = res.json()["history"]
    assert len(history) >= 2
    assert history[-1]["new_status"] == "shortlisted"

    # 5. Candidate received automated notification for status change
    res = client.get("/api/v1/notifications", headers=seeker_headers)
    assert res.status_code == 200
    titles = [n["title"] for n in res.json()]
    assert any("Shortlisted" in t for t in titles)


# ---------------------------------------------------------------------------
# Test Job Competition Indicators
# ---------------------------------------------------------------------------
def test_job_competition_indicators():
    job_seeker = create_user("seeker_comp@example.com", "Seeker Comp", Role.JOB_SEEKER)
    headers = auth_header(job_seeker)

    # Job with 0 applicants should be "Low" competition and early_applicant = True
    res = client.get("/api/v1/jobs/job-99/competition", headers=headers)
    assert res.status_code == 200
    assert res.json()["applicant_count"] == 0
    assert res.json()["competition_level"] == "Low"
    assert res.json()["early_applicant"] is True

    # Apply to job-99
    client.post("/api/v1/applications", headers=headers, json={"job_id": "job-99"})

    res = client.get("/api/v1/jobs/job-99/competition", headers=headers)
    assert res.json()["applicant_count"] == 1


# ---------------------------------------------------------------------------
# Test Dashboard & Analytics
# ---------------------------------------------------------------------------
def test_analytics_by_role():
    job_seeker = create_user("analytics_seeker@example.com", "Analytics Seeker", Role.JOB_SEEKER)
    recruiter = create_user("analytics_recruiter@example.com", "Analytics Recruiter", Role.RECRUITER)
    admin = create_user("analytics_admin@example.com", "Analytics Admin", Role.ADMIN)

    # Job seeker analytics
    res = client.get("/api/v1/analytics/job-seeker", headers=auth_header(job_seeker))
    assert res.status_code == 200
    assert "resume_performance" in res.json()
    assert "skill_gaps" in res.json()

    # Recruiter analytics
    res = client.get("/api/v1/analytics/recruiter", headers=auth_header(recruiter))
    assert res.status_code == 200
    assert "applicants_per_job" in res.json()

    # Admin analytics
    res = client.get("/api/v1/analytics/admin", headers=auth_header(admin))
    assert res.status_code == 200
    assert res.json()["total_users"] == 3

    # Hiring trends (public/authenticated)
    res = client.get("/api/v1/analytics/hiring-trends", headers=auth_header(job_seeker))
    assert res.status_code == 200
    assert "top_in_demand_skills" in res.json()


# ---------------------------------------------------------------------------
# Test Security & RBAC Enforcement
# ---------------------------------------------------------------------------
def test_rbac_security_checks():
    job_seeker = create_user("user_rbac@example.com", "RBAC User", Role.JOB_SEEKER)
    headers = auth_header(job_seeker)

    # Job Seeker cannot access Admin analytics (403 Forbidden)
    res = client.get("/api/v1/analytics/admin", headers=headers)
    assert res.status_code == 403

    # Security headers present
    res = client.get("/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
