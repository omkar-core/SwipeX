"""
Milestone 3 tests: Resume Service + ATS Scoring routes.

Run with:  pytest -v tests/test_m3_gateway.py
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_m3.db"
os.environ["RESUME_SERVICE_URL"] = "http://fake-resume-service"

import pytest
import respx
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app import models
from app.database import Base, engine


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def _get_token(role="job_seeker", email="m3user@example.com"):
    client.post("/api/v1/auth/register", json={
        "name": "M3 Tester", "email": email, "password": "password123", "role": role,
    })
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    return login.json()["access_token"]


# ---------------------------------------------------------------------------
# Day 2: resume upload + listing
# ---------------------------------------------------------------------------

@respx.mock
def test_job_seeker_can_upload_resume():
    token = _get_token(role="job_seeker")
    respx.post("http://fake-resume-service/api/v1/resumes/upload").mock(
        return_value=httpx.Response(201, json={"resume_id": "r1", "version": 1})
    )
    r = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("resume.pdf", b"fake pdf content", "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201


def test_recruiter_cannot_upload_resume():
    """RBAC: resume upload is Job Seeker only."""
    token = _get_token(role="recruiter", email="recruiter3@example.com")
    r = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("resume.pdf", b"fake", "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_upload_requires_login():
    r = client.post("/api/v1/resumes/upload", files={"file": ("r.pdf", b"x", "application/pdf")})
    assert r.status_code in (401, 403)


@respx.mock
def test_list_resumes_requires_login_but_any_role():
    token = _get_token()
    respx.get("http://fake-resume-service/api/v1/resumes").mock(
        return_value=httpx.Response(200, json=[{"resume_id": "r1", "version": 1}])
    )
    r = client.get("/api/v1/resumes", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_list_resumes_without_login_rejected():
    r = client.get("/api/v1/resumes")
    assert r.status_code in (401, 403)


@respx.mock
def test_resume_detail_forwards_correctly():
    token = _get_token()
    respx.get("http://fake-resume-service/api/v1/resumes/r1").mock(
        return_value=httpx.Response(200, json={"resume_id": "r1", "version": 1})
    )
    r = client.get("/api/v1/resumes/r1", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Day 3: parse trigger
# ---------------------------------------------------------------------------

@respx.mock
def test_job_seeker_can_trigger_parse():
    token = _get_token()
    respx.post("http://fake-resume-service/api/v1/resumes/r1/parse").mock(
        return_value=httpx.Response(200, json={"parsed_text": "...", "extracted_skills": ["python"]})
    )
    r = client.post("/api/v1/resumes/r1/parse", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "python" in r.json()["extracted_skills"]


def test_recruiter_cannot_trigger_parse():
    token = _get_token(role="recruiter", email="recruiter4@example.com")
    r = client.post("/api/v1/resumes/r1/parse", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Day 4-5: ATS scoring (+ AI suggestions on the same response)
# ---------------------------------------------------------------------------

@respx.mock
def test_ats_score_returns_full_shape():
    token = _get_token()
    respx.post("http://fake-resume-service/api/v1/ats/score").mock(
        return_value=httpx.Response(200, json={
            "match_score": 74,
            "missing_keywords": ["docker", "kubernetes"],
            "missing_skills": ["ci/cd"],
            "suggestions": ["Add a Docker/K8s project to your experience section."],
        })
    )
    r = client.post(
        "/api/v1/ats/score",
        json={"resume_id": "r1", "job_id": "j1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["match_score"] == 74
    assert "docker" in body["missing_keywords"]
    assert len(body["suggestions"]) > 0


def test_ats_score_requires_login():
    r = client.post("/api/v1/ats/score", json={"resume_id": "r1", "job_id": "j1"})
    assert r.status_code in (401, 403)


@respx.mock
def test_ats_score_503_when_resume_service_down():
    token = _get_token()
    respx.post("http://fake-resume-service/api/v1/ats/score").mock(
        side_effect=httpx.ConnectError("refused")
    )
    r = client.post(
        "/api/v1/ats/score",
        json={"resume_id": "r1", "job_id": "j1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 503


@respx.mock
def test_ats_score_504_when_resume_service_too_slow():
    """Guards the timeout-handling fix — a slow (not down) upstream must
    return a clean 504, not crash with an unhandled 500."""
    token = _get_token()
    respx.post("http://fake-resume-service/api/v1/ats/score").mock(
        side_effect=httpx.ReadTimeout("took too long")
    )
    r = client.post(
        "/api/v1/ats/score",
        json={"resume_id": "r1", "job_id": "j1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 504