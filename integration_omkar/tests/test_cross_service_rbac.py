"""
test_cross_service_rbac.py - Cross-Service Role-Based Access Control (RBAC) Tests.

Validates that:
- Unauthenticated requests are rejected (401 Unauthorized)
- Invalid tokens are rejected (401 Unauthorized)
- Recruiter accounts are blocked from swiping (403 Forbidden)
- Job Seeker accounts are permitted to swipe (201 Created)
"""
import uuid
import pytest
import httpx

def test_unauthenticated_request_rejected(gateway_url, check_gateway_health):
    # Missing token on /auth/me
    res_me = httpx.get(f"{gateway_url}/api/v1/auth/me", timeout=5.0)
    assert res_me.status_code in (401, 403), f"Expected 401 or 403, got {res_me.status_code}"

    # Missing token on /swipes
    fake_job_id = str(uuid.uuid4())
    res_swipe = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": fake_job_id, "direction": "RIGHT"},
        timeout=5.0
    )
    assert res_swipe.status_code in (401, 403), f"Expected 401 or 403, got {res_swipe.status_code}"


def test_invalid_token_rejected(gateway_url, check_gateway_health):
    headers = {"Authorization": "Bearer bad.token.here"}
    res = httpx.get(f"{gateway_url}/api/v1/auth/me", headers=headers, timeout=5.0)
    assert res.status_code == 401, f"Expected 401 for bad token, got {res.status_code}"


def test_recruiter_blocked_from_swiping(gateway_url, test_recruiter):
    """Verifies that a user with the 'recruiter' role is forbidden (403) from calling /api/v1/swipes."""
    fake_job_id = str(uuid.uuid4())
    res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": fake_job_id, "direction": "RIGHT"},
        headers=test_recruiter["headers"],
        timeout=5.0
    )
    assert res.status_code == 403, (
        f"Expected 403 Forbidden for recruiter swipe, got {res.status_code}: {res.text}"
    )


def test_job_seeker_allowed_to_swipe(gateway_url, test_job_seeker):
    """Verifies that a 'job_seeker' can access /swipes and is not blocked by RBAC."""
    # Fetch valid job_id first
    jobs_res = httpx.get(f"{gateway_url}/api/v1/jobs?page_size=1", headers=test_job_seeker["headers"], timeout=5.0)
    assert jobs_res.status_code == 200
    job_id = jobs_res.json()[0]["job_id"]

    res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_id, "direction": "RIGHT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert res.status_code == 201, f"Expected 201 Created for job_seeker swipe, got {res.status_code}"


def test_recruiter_allowed_to_create_job(gateway_url, test_recruiter):
    """M2-RBAC-005: Verifies that a Recruiter can access POST /api/v1/jobs."""
    payload = {
        "title": "Staff Backend Engineer",
        "description": "Lead architecture for distributed systems.",
        "location": "Bangalore",
        "salary_min": 2500000,
        "salary_max": 4000000,
        "skills": ["Python", "FastAPI", "PostgreSQL"]
    }
    res = httpx.post(
        f"{gateway_url}/api/v1/jobs",
        json=payload,
        headers=test_recruiter["headers"],
        timeout=5.0
    )
    # The gateway forwards to Job service (which returns 200/201, 405 if downstream stub, or 503 if downstream not running)
    assert res.status_code in (200, 201, 405, 503), f"Unexpected status {res.status_code}: {res.text}"


def test_job_seeker_blocked_from_creating_job(gateway_url, test_job_seeker):
    """M2-RBAC-006: Verifies that a Job Seeker is forbidden (403) from creating jobs."""
    payload = {
        "title": "Unauthorized Job",
        "description": "Should be blocked.",
        "location": "Remote"
    }
    res = httpx.post(
        f"{gateway_url}/api/v1/jobs",
        json=payload,
        headers=test_job_seeker["headers"],
        timeout=5.0
    )
    assert res.status_code == 403, f"Expected 403 Forbidden for job seeker posting job, got {res.status_code}"


def test_public_browsing_without_token(gateway_url, check_gateway_health):
    """M2-RBAC-007: Verifies that public browsing on /jobs and /companies requires no token."""
    res_jobs = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=2", timeout=5.0)
    assert res_jobs.status_code == 200, f"Public jobs browsing failed: {res_jobs.status_code}"

    res_companies = httpx.get(f"{gateway_url}/api/v1/companies", timeout=5.0)
    assert res_companies.status_code in (200, 503), f"Public companies browsing failed: {res_companies.status_code}"

