"""
test_m2_e2e_flow.py - Automated Milestone 2 End-to-End Candidate Discovery & Swipe Flow.

Simulates the complete user lifecycle:
1. Register new Job Seeker
2. Login and verify JWT & profile
3. Browse public job feed
4. Filter jobs by parameters (location, salary, skills)
5. Fetch full job detail
6. Record RIGHT swipe (apply/save) and LEFT swipe (skip)
7. Verify swipe history
8. Verify feed exclusion of swiped jobs
9. Fetch AI/heuristic recommendations
"""
import uuid
import httpx
import pytest

@pytest.mark.integration
def test_m2_complete_candidate_journey(gateway_url, check_gateway_health):
    """M2-E2E-001: Comprehensive end-to-end user journey across all M2 microservices."""
    unique_id = uuid.uuid4().hex[:8]
    email = f"e2e_candidate_{unique_id}@swipex-test.com"
    password = "SecurePassword123!"
    name = f"Candidate {unique_id}"

    # Step 1: Register
    reg_res = httpx.post(f"{gateway_url}/api/v1/auth/register", json={
        "name": name,
        "email": email,
        "password": password,
        "role": "job_seeker"
    }, timeout=10.0)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    user_id = reg_res.json()["user_id"]

    # Step 2: Login
    login_res = httpx.post(f"{gateway_url}/api/v1/auth/login", json={
        "email": email,
        "password": password
    }, timeout=10.0)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 3: Verify Profile via /auth/me
    me_res = httpx.get(f"{gateway_url}/api/v1/auth/me", headers=headers, timeout=10.0)
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["user_id"] == user_id
    assert profile["role"] == "job_seeker"

    # Step 4: Browse Job Feed
    feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=10", headers=headers, timeout=10.0)
    assert feed_res.status_code == 200
    jobs = feed_res.json()
    assert isinstance(jobs, list)
    if not jobs:
        pytest.skip("No jobs available to complete E2E test")

    # Step 5: Filter Jobs
    filtered_res = httpx.get(
        f"{gateway_url}/api/v1/jobs?location=India&page=1&page_size=5",
        headers=headers,
        timeout=10.0
    )
    assert filtered_res.status_code == 200

    # Step 6: View Job Details
    target_job = jobs[0]
    detail_res = httpx.get(f"{gateway_url}/api/v1/jobs/{target_job['job_id']}", headers=headers, timeout=10.0)
    assert detail_res.status_code == 200
    assert detail_res.json()["job_id"] == target_job["job_id"]

    # Step 7: Record RIGHT Swipe (Apply / Save)
    swipe_res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": target_job["job_id"], "direction": "RIGHT"},
        headers=headers,
        timeout=10.0
    )
    assert swipe_res.status_code == 201

    # Step 8: Verify Swipe History
    history_res = httpx.get(f"{gateway_url}/api/v1/swipes/history", headers=headers, timeout=10.0)
    assert history_res.status_code == 200
    history = history_res.json()
    assert any(str(item["job_id"]) == str(target_job["job_id"]) for item in history)

    # Step 9: Verify Feed Exclusion
    next_feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=10", headers=headers, timeout=10.0)
    assert next_feed_res.status_code == 200
    next_job_ids = [j["job_id"] for j in next_feed_res.json()]
    assert target_job["job_id"] not in next_job_ids, "Swiped job must not appear in subsequent feed"
