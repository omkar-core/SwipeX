"""
Milestone 2 tests: optional-auth browsing routes, RBAC on new endpoints.

Run with:  pytest -v tests/test_m2_gateway.py
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_m2.db"
os.environ["JOB_SERVICE_URL"] = "http://fake-job-service"
os.environ["MATCHING_ENGINE_URL"] = "http://fake-matching-engine"

import pytest
import respx
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def _get_token(role="job_seeker", email="m2user@example.com"):
    client.post("/api/v1/auth/register", json={
        "name": "M2 Tester", "email": email, "password": "password123", "role": role,
    })
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    return login.json()["access_token"]


@respx.mock
def test_jobs_browsing_works_without_login():
    """GET /jobs is PUBLIC now — no token needed, matching data_hanith's
    'Public / Optional Auth' contract."""
    respx.get("http://fake-job-service/api/v1/jobs").mock(
        return_value=httpx.Response(200, json=[{"job_id": "1", "title": "Backend Intern"}])
    )
    r = client.get("/api/v1/jobs")  # no Authorization header at all
    assert r.status_code == 200


@respx.mock
def test_jobs_browsing_also_works_with_login():
    """Same route, but WITH a token — should still succeed (optional auth
    means logged-in users get through too, not blocked)."""
    token = _get_token()
    respx.get("http://fake-job-service/api/v1/jobs").mock(
        return_value=httpx.Response(200, json=[])
    )
    r = client.get("/api/v1/jobs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


@respx.mock
def test_job_search_is_public():
    respx.get("http://fake-job-service/api/v1/jobs/search").mock(
        return_value=httpx.Response(200, json=[])
    )
    r = client.get("/api/v1/jobs/search?q=python")
    assert r.status_code == 200


@respx.mock
def test_companies_listing_is_public():
    respx.get("http://fake-job-service/api/v1/companies").mock(
        return_value=httpx.Response(200, json=[])
    )
    r = client.get("/api/v1/companies")
    assert r.status_code == 200


@respx.mock
def test_recruiter_can_create_job():
    token = _get_token(role="recruiter", email="recruiter@example.com")
    respx.post("http://fake-job-service/api/v1/jobs").mock(
        return_value=httpx.Response(201, json={"job_id": "new-job-1"})
    )
    r = client.post(
        "/api/v1/jobs",
        json={"title": "New Role", "description": "desc", "location": "Remote"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201


def test_job_seeker_cannot_create_job():
    """RBAC: only Recruiters can post jobs — a Job Seeker should get 403."""
    token = _get_token(role="job_seeker", email="seeker@example.com")
    r = client.post(
        "/api/v1/jobs",
        json={"title": "New Role", "description": "desc", "location": "Remote"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_create_job_requires_login_at_all():
    r = client.post("/api/v1/jobs", json={"title": "X"})
    assert r.status_code in (401, 403)


@respx.mock
def test_recommendations_route_forwards_to_matching_engine():
    token = _get_token()
    respx.get("http://fake-matching-engine/api/v1/recommendations").mock(
        return_value=httpx.Response(200, json=[{"job_id": "1", "match_percentage": 87}])
    )
    r = client.get("/api/v1/recommendations", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()[0]["match_percentage"] == 87


@respx.mock
def test_recommendations_503_when_matching_engine_not_running():
    token = _get_token()
    respx.get("http://fake-matching-engine/api/v1/recommendations").mock(
        side_effect=httpx.ConnectError("refused")
    )
    r = client.get("/api/v1/recommendations", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 503
