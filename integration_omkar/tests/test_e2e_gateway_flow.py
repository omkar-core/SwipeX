"""
test_e2e_gateway_flow.py - Live End-to-End System Integration Tests.

Validates the full journey:
Register -> Login -> Issue JWT -> Call /jobs through Gateway -> Call /jobs/{id}
-> Submit RIGHT swipe -> Submit LEFT swipe -> Verify duplicate conflict (409)
-> Verify swipe history -> Verify feed exclusion.
"""
import pytest
import httpx

def test_auth_registration_login_and_me(gateway_url, test_job_seeker):
    """Verifies that an unauthenticated user can register, log in, and fetch their profile via /me."""
    headers = test_job_seeker["headers"]
    me_res = httpx.get(f"{gateway_url}/api/v1/auth/me", headers=headers, timeout=5.0)
    assert me_res.status_code == 200, f"Expected 200 from /me, got {me_res.status_code}: {me_res.text}"
    me_data = me_res.json()
    assert me_data["user_id"] == test_job_seeker["user_id"]
    assert me_data["role"] == "job_seeker"


def test_gateway_to_job_service_feed_and_details(gateway_url, test_job_seeker):
    """Verifies that the Gateway correctly proxies job listing and detail requests to the Job service."""
    headers = test_job_seeker["headers"]

    # 1. Fetch job listings through Gateway
    jobs_res = httpx.get(f"{gateway_url}/api/v1/jobs?page_size=5", headers=headers, timeout=5.0)
    assert jobs_res.status_code == 200, f"Expected 200 from /jobs, got {jobs_res.status_code}: {jobs_res.text}"
    jobs = jobs_res.json()
    assert isinstance(jobs, list), "Expected list of jobs"
    assert len(jobs) > 0, "Expected at least one job in the seed database"

    first_job = jobs[0]
    assert "job_id" in first_job
    assert "title" in first_job
    assert "company" in first_job
    job_id = first_job["job_id"]

    # 2. Fetch specific job detail through Gateway
    detail_res = httpx.get(f"{gateway_url}/api/v1/jobs/{job_id}", headers=headers, timeout=5.0)
    assert detail_res.status_code == 200, f"Expected 200 from /jobs/{job_id}, got {detail_res.status_code}: {detail_res.text}"
    job_detail = detail_res.json()
    assert job_detail["job_id"] == job_id
    assert "job_description" in job_detail or "description" in job_detail
    assert "skills" in job_detail


def test_gateway_swipe_actions_and_history(gateway_url, test_job_seeker):
    """Verifies that swipes can be recorded through Gateway, duplicate swipes are rejected, and history is maintained."""
    headers = test_job_seeker["headers"]

    # 1. Retrieve first 2 jobs
    jobs_res = httpx.get(f"{gateway_url}/api/v1/jobs?page_size=5", headers=headers, timeout=5.0)
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()
    assert len(jobs) >= 2, "Need at least 2 jobs to test right and left swipes"
    job_1_id = jobs[0]["job_id"]
    job_2_id = jobs[1]["job_id"]

    # 2. Post RIGHT swipe on job 1
    swipe_right_res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_1_id, "direction": "RIGHT"},
        headers=headers,
        timeout=5.0
    )
    assert swipe_right_res.status_code == 201, f"Expected 201 for RIGHT swipe, got {swipe_right_res.status_code}: {swipe_right_res.text}"
    right_data = swipe_right_res.json()
    assert "swipe_id" in right_data

    # 3. Post LEFT swipe on job 2
    swipe_left_res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_2_id, "direction": "LEFT"},
        headers=headers,
        timeout=5.0
    )
    assert swipe_left_res.status_code == 201, f"Expected 201 for LEFT swipe, got {swipe_left_res.status_code}: {swipe_left_res.text}"

    # 4. Attempt duplicate swipe on job 1 -> should return 409 Conflict
    dup_res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_1_id, "direction": "RIGHT"},
        headers=headers,
        timeout=5.0
    )
    assert dup_res.status_code == 409, f"Expected 409 for duplicate swipe, got {dup_res.status_code}"

    # 5. Fetch swipe history through Gateway
    history_res = httpx.get(f"{gateway_url}/api/v1/swipes/history", headers=headers, timeout=5.0)
    assert history_res.status_code == 200, f"Expected 200 for swipe history, got {history_res.status_code}"
    history = history_res.json()
    assert isinstance(history, list)
    swiped_ids = [item["job_id"] for item in history]
    assert job_1_id in swiped_ids, "Expected job 1 in swipe history"
    assert job_2_id in swiped_ids, "Expected job 2 in swipe history"

    # 6. Verify swiped jobs are excluded from future feeds for this user
    next_jobs_res = httpx.get(f"{gateway_url}/api/v1/jobs?page_size=10", headers=headers, timeout=5.0)
    assert next_jobs_res.status_code == 200
    next_jobs = next_jobs_res.json()
    next_job_ids = [j["job_id"] for j in next_jobs]
    assert job_1_id not in next_job_ids, "Swiped job 1 should be excluded from authenticated feed"
    assert job_2_id not in next_job_ids, "Swiped job 2 should be excluded from authenticated feed"
