"""
test_m2_swipe_system.py - Automated Milestone 2 Integration Tests for Swipe System.

Validates:
- M2-SWIPE-001: RIGHT swipe action (apply/save) recording (201 Created)
- M2-SWIPE-002: LEFT swipe action (skip/pass) recording (201 Created)
- M2-SWIPE-003: Duplicate swipe rejection on same job_id (409 Conflict)
- M2-SWIPE-004: Swipe targeting non-existent job UUID (404 Not Found)
- M2-SWIPE-005: Swipe history retrieval (GET /api/v1/swipes/history)
- M2-SWIPE-006: Personalized feed exclusion for swiped jobs
"""
import uuid
import httpx
import pytest

@pytest.mark.integration
def test_m2_record_right_swipe(gateway_url, check_gateway_health, test_job_seeker):
    """M2-SWIPE-001: Verifies recording a RIGHT swipe action."""
    feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=5", timeout=10.0)
    assert feed_res.status_code == 200
    jobs = feed_res.json()
    if not jobs:
        pytest.skip("No jobs available to test swipe")

    job_id = jobs[0]["job_id"]
    swipe_res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_id, "direction": "RIGHT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert swipe_res.status_code == 201, f"Expected 201 Created, got {swipe_res.status_code}: {swipe_res.text}"
    data = swipe_res.json()
    assert "swipe_id" in data, "Response must include swipe_id"

@pytest.mark.integration
def test_m2_record_left_swipe(gateway_url, check_gateway_health, test_job_seeker):
    """M2-SWIPE-002: Verifies recording a LEFT swipe action."""
    feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=5", timeout=10.0)
    assert feed_res.status_code == 200
    jobs = feed_res.json()
    if len(jobs) < 2:
        pytest.skip("Need at least 2 jobs to test left swipe separately")

    job_id = jobs[1]["job_id"]
    swipe_res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_id, "direction": "LEFT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert swipe_res.status_code == 201, f"Expected 201 Created, got {swipe_res.status_code}: {swipe_res.text}"
    data = swipe_res.json()
    assert "swipe_id" in data

@pytest.mark.integration
def test_m2_duplicate_swipe_conflict_409(gateway_url, check_gateway_health, test_job_seeker):
    """M2-SWIPE-003: Verifies that swiping the same job twice returns 409 Conflict."""
    feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=5", timeout=10.0)
    assert feed_res.status_code == 200
    jobs = feed_res.json()
    if not jobs:
        pytest.skip("No jobs to test duplicate swipe")

    job_id = jobs[0]["job_id"]
    # First swipe
    res1 = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_id, "direction": "RIGHT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert res1.status_code == 201

    # Second swipe on identical job_id
    res2 = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_id, "direction": "RIGHT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert res2.status_code == 409, f"Expected 409 Conflict on duplicate swipe, got {res2.status_code}"

@pytest.mark.integration
def test_m2_swipe_non_existent_job_404(gateway_url, check_gateway_health, test_job_seeker):
    """M2-SWIPE-004: Verifies that swiping a non-existent job UUID returns 404 Not Found."""
    fake_job_id = str(uuid.uuid4())
    res = httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": fake_job_id, "direction": "RIGHT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert res.status_code == 404, f"Expected 404 for missing job, got {res.status_code}"

@pytest.mark.integration
def test_m2_swipe_history_retrieval(gateway_url, check_gateway_health, test_job_seeker):
    """M2-SWIPE-005: Verifies fetching authenticated user's swipe history."""
    feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=3", timeout=10.0)
    assert feed_res.status_code == 200
    jobs = feed_res.json()
    if not jobs:
        pytest.skip("No jobs available")

    # Perform a swipe
    job_id = jobs[0]["job_id"]
    httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": job_id, "direction": "RIGHT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )

    # Fetch history
    history_res = httpx.get(
        f"{gateway_url}/api/v1/swipes/history",
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert history_res.status_code == 200
    history = history_res.json()
    assert isinstance(history, list)
    assert len(history) >= 1
    assert any(str(item["job_id"]) == str(job_id) for item in history)

@pytest.mark.integration
def test_m2_swiped_job_feed_exclusion(gateway_url, check_gateway_health, test_job_seeker):
    """M2-SWIPE-006: Verifies that a swiped job is excluded from the user's subsequent feed."""
    feed_res = httpx.get(
        f"{gateway_url}/api/v1/jobs?page=1&page_size=10",
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert feed_res.status_code == 200
    initial_jobs = feed_res.json()
    if not initial_jobs:
        pytest.skip("No jobs to test exclusion")

    swiped_job_id = initial_jobs[0]["job_id"]

    # Swipe the first job
    httpx.post(
        f"{gateway_url}/api/v1/swipes",
        json={"job_id": swiped_job_id, "direction": "LEFT"},
        headers=test_job_seeker["headers"],
        timeout=10.0
    )

    # Fetch feed again with seeker credentials
    updated_feed_res = httpx.get(
        f"{gateway_url}/api/v1/jobs?page=1&page_size=10",
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    assert updated_feed_res.status_code == 200
    updated_jobs = updated_feed_res.json()
    updated_ids = [j["job_id"] for j in updated_jobs]
    assert swiped_job_id not in updated_ids, f"Swiped job {swiped_job_id} must be excluded from user feed"
