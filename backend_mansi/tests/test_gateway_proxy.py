"""
Day 5 checklist: "Joint test with Intern 5 done" / "All three services
reachable via one Gateway"

Intern 2 and Intern 3's actual services don't exist yet, so this test
mocks them out — proving the GATEWAY's forwarding logic is correct
(headers pass through, auth is enforced first, the right upstream URL
gets called) independent of whether the real services are ready.
Once they exist, the same routes will work against them with zero
changes to gateway.py.

Uses respx to intercept httpx calls (the library gateway.py uses to
proxy requests) — add `respx==0.21.1` to requirements.txt to run this.

Run with:  pytest -v tests/test_gateway_proxy.py
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_gateway.db"
os.environ["JOB_SERVICE_URL"] = "http://fake-job-service"
os.environ["RESUME_SERVICE_URL"] = "http://fake-resume-service"

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


def _get_token(role="job_seeker"):
    client.post("/api/v1/auth/register", json={
        "name": "Gateway Tester", "email": f"{role}@example.com",
        "password": "password123", "role": role,
    })
    login = client.post("/api/v1/auth/login", json={"email": f"{role}@example.com", "password": "password123"})
    return login.json()["access_token"]


@respx.mock
def test_gateway_forwards_job_list_to_job_service():
    token = _get_token()
    mocked_jobs = [{"job_id": "1", "title": "Backend Intern"}]
    respx.get("http://fake-job-service/api/v1/jobs").mock(
        return_value=httpx.Response(200, json=mocked_jobs)
    )

    r = client.get("/api/v1/jobs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() == mocked_jobs


@respx.mock
def test_gateway_forwards_swipe_creation_to_job_service():
    token = _get_token()  # job_seeker role — allowed to swipe
    respx.post("http://fake-job-service/api/v1/swipes").mock(
        return_value=httpx.Response(201, json={"swipe_id": "abc123"})
    )

    r = client.post(
        "/api/v1/swipes",
        json={"job_id": "1", "direction": "right"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    assert r.json() == {"swipe_id": "abc123"}


def test_gateway_rejects_unauthenticated_requests_before_forwarding():
    """
    No token at all on a route that actually REQUIRES login — the Gateway
    should reject this itself and never even attempt to call the upstream
    Job service.

    NOTE: this used to test GET /api/v1/jobs, but Milestone 2 deliberately
    made job browsing PUBLIC (matching data_hanith's own "Public / Optional
    Auth" contract) — see test_jobs_browsing_works_without_login in
    test_m2_gateway.py for that new, correct behavior. This test now
    checks POST /api/v1/swipes instead, which is still genuinely
    restricted to logged-in Job Seekers.
    """
    r = client.post("/api/v1/swipes", json={"job_id": "1", "direction": "right"})
    assert r.status_code in (401, 403)


@respx.mock
def test_gateway_returns_503_when_upstream_unreachable():
    """
    Simulates the CURRENT real situation: Job service isn't running yet.
    Gateway should fail gracefully with a 503, not crash.
    """
    token = _get_token()
    respx.get("http://fake-job-service/api/v1/jobs").mock(side_effect=httpx.ConnectError("refused"))

    r = client.get("/api/v1/jobs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 503


@respx.mock
def test_gateway_forwards_resume_ats_score_to_resume_service():
    """
    Updated for Milestone 3: the old GET /api/v1/resume/{id}/ats-score
    route was replaced by POST /api/v1/ats/score (see
    docs/m3-api-contracts.md). This test now checks the current contract
    instead of the retired one.
    """
    token = _get_token()
    respx.post("http://fake-resume-service/api/v1/ats/score").mock(
        return_value=httpx.Response(200, json={"match_score": 72, "missing_keywords": ["docker"]})
    )

    r = client.post(
        "/api/v1/ats/score",
        json={"resume_id": "r1", "job_id": "j1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200