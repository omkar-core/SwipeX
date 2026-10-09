"""
Milestone 2 tests: optional-auth browsing, RBAC on new endpoints,
swipe direction normalisation, identity-header forwarding.

Run with:  pytest -v tests/test_m2_gateway.py
"""
import json
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_m2.db"
os.environ["JOB_SERVICE_URL"] = "http://fake-job-service"
os.environ["MATCHING_ENGINE_URL"] = "http://fake-matching-engine"

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


def _get_token(role="job_seeker", email="m2user@example.com"):
    client.post("/api/v1/auth/register", json={
        "name": "M2 Tester", "email": email, "password": "password123", "role": role,
    })
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    return login.json()["access_token"]


# ---------------------------------------------------------------------------
# Day 2: public browsing
# ---------------------------------------------------------------------------

@respx.mock
def test_jobs_browsing_works_without_login():
    """GET /jobs is PUBLIC — matching data_hanith's 'Public / Optional Auth'."""
    respx.get("http://fake-job-service/api/v1/jobs").mock(
        return_value=httpx.Response(200, json=[{"job_id": "1", "title": "Backend Intern"}])
    )
    r = client.get("/api/v1/jobs")  # no Authorization header at all
    assert r.status_code == 200


@respx.mock
def test_jobs_browsing_also_works_with_login():
    token = _get_token()
    respx.get("http://fake-job-service/api/v1/jobs").mock(
        return_value=httpx.Response(200, json=[])
    )
    r = client.get("/api/v1/jobs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Day 3: search + companies
# ---------------------------------------------------------------------------

@respx.mock
def test_job_search_is_public_and_hits_search_path():
    """
    Also guards the route-ordering bug: /jobs/search must be matched by the
    search route, NOT swallowed by /jobs/{job_id} treating "search" as an ID.
    """
    search_route = respx.get("http://fake-job-service/api/v1/jobs/search").mock(
        return_value=httpx.Response(200, json=[])
    )
    r = client.get("/api/v1/jobs/search?q=python")
    assert r.status_code == 200
    assert search_route.called, "/jobs/search was swallowed by the {job_id} route"


@respx.mock
def test_job_search_forwards_query_params():
    route = respx.get("http://fake-job-service/api/v1/jobs/search").mock(
        return_value=httpx.Response(200, json=[])
    )
    client.get("/api/v1/jobs/search?q=python&location=Pune&salary_min=500000")
    sent = route.calls[0].request
    assert "q=python" in str(sent.url)
    assert "location=Pune" in str(sent.url)


@respx.mock
def test_companies_listing_is_public():
    respx.get("http://fake-job-service/api/v1/companies").mock(
        return_value=httpx.Response(200, json=[])
    )
    assert client.get("/api/v1/companies").status_code == 200


@respx.mock
def test_company_detail_is_public():
    respx.get("http://fake-job-service/api/v1/companies/abc-123").mock(
        return_value=httpx.Response(200, json={"company_id": "abc-123", "name": "Acme"})
    )
    r = client.get("/api/v1/companies/abc-123")
    assert r.status_code == 200
    assert r.json()["name"] == "Acme"


# ---------------------------------------------------------------------------
# Day 3-4: swipe direction normalisation + identity headers
# ---------------------------------------------------------------------------

@respx.mock
def test_swipe_direction_normalised_to_uppercase():
    """
    Frontend sends lowercase "right"; data_hanith's CHECK constraint only
    accepts "RIGHT". The Gateway must convert before forwarding.
    """
    token = _get_token()
    route = respx.post("http://fake-job-service/api/v1/swipes").mock(
        return_value=httpx.Response(201, json={"swipe_id": "s1"})
    )
    r = client.post(
        "/api/v1/swipes",
        json={"job_id": "job-1", "direction": "right"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    forwarded = json.loads(route.calls[0].request.content)
    assert forwarded["direction"] == "RIGHT", "direction was not upper-cased"
    assert forwarded["job_id"] == "job-1", "other fields must survive the rewrite"


@respx.mock
def test_swipe_already_uppercase_stays_uppercase():
    token = _get_token()
    route = respx.post("http://fake-job-service/api/v1/swipes").mock(
        return_value=httpx.Response(201, json={"swipe_id": "s2"})
    )
    client.post(
        "/api/v1/swipes",
        json={"job_id": "job-2", "direction": "LEFT"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert json.loads(route.calls[0].request.content)["direction"] == "LEFT"


@respx.mock
def test_gateway_injects_identity_headers():
    """
    data_hanith's dependencies.py can trust X-User-Id / X-User-Role from
    the Gateway. Confirm we actually send them.
    """
    token = _get_token()
    route = respx.get("http://fake-job-service/api/v1/swipes/history").mock(
        return_value=httpx.Response(200, json=[])
    )
    client.get("/api/v1/swipes/history", headers={"Authorization": f"Bearer {token}"})
    sent_headers = route.calls[0].request.headers
    assert "x-user-id" in sent_headers
    assert sent_headers["x-user-role"] == "job_seeker"


# ---------------------------------------------------------------------------
# Day 4: Recruiter job-posting RBAC
# ---------------------------------------------------------------------------

@respx.mock
def test_recruiter_can_create_job():
    token = _get_token(role="recruiter", email="recruiter@example.com")
    respx.post("http://fake-job-service/api/v1/jobs").mock(
        return_value=httpx.Response(201, json={"job_id": "new-job-1"})
    )
    r = client.post(
        "/api/v1/jobs",
        json={"title": "New Role", "location": "Remote"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201


def test_job_seeker_cannot_create_job():
    """RBAC: only Recruiters can post jobs — a Job Seeker gets 403."""
    token = _get_token(role="job_seeker", email="seeker@example.com")
    r = client.post(
        "/api/v1/jobs",
        json={"title": "New Role"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


@respx.mock
def test_recruiter_can_update_job():
    token = _get_token(role="recruiter", email="recruiter2@example.com")
    respx.put("http://fake-job-service/api/v1/jobs/job-9").mock(
        return_value=httpx.Response(200, json={"job_id": "job-9"})
    )
    r = client.put(
        "/api/v1/jobs/job-9",
        json={"title": "Updated"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200


def test_create_job_requires_login_at_all():
    r = client.post("/api/v1/jobs", json={"title": "X"})
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Day 4-5: Matching Engine
# ---------------------------------------------------------------------------

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
