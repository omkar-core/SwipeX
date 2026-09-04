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
        timeout=5.0
    )
    assert res.status_code == 201, f"Expected 201 Created for job_seeker swipe, got {res.status_code}"
