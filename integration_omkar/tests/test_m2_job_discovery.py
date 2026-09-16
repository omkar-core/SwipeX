"""
test_m2_job_discovery.py - Automated Milestone 2 Integration Tests for Job Discovery.

Validates:
- M2-JOB-001: Paginated public job feed listing (GET /api/v1/jobs)
- M2-JOB-002: Pagination bounds and page sizing
- M2-JOB-003: Job detail retrieval by UUID (GET /api/v1/jobs/{id})
- M2-JOB-004: Invalid UUID format rejection (400 Bad Request)
- M2-JOB-005: Non-existent job UUID handling (404 Not Found)
- M2-JOB-006: Job freshness and metadata fields validation
"""
import uuid
import httpx
import pytest

@pytest.mark.integration
def test_m2_public_job_feed_listing(gateway_url, check_gateway_health):
    """M2-JOB-001: Verifies that job feed is publicly accessible without authentication."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs", timeout=10.0)
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
    jobs = res.json()
    assert isinstance(jobs, list), "Response must be a list of jobs"
    if len(jobs) > 0:
        first_job = jobs[0]
        assert "job_id" in first_job, "Job summary must contain job_id"
        assert "title" in first_job, "Job summary must contain title"
        assert "location" in first_job, "Job summary must contain location"
        assert "skills" in first_job, "Job summary must contain skills list"

@pytest.mark.integration
def test_m2_job_pagination_sizing(gateway_url, check_gateway_health):
    """M2-JOB-002: Verifies pagination parameters page and page_size."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=3", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)
    assert len(jobs) <= 3, f"Expected at most 3 jobs, got {len(jobs)}"

@pytest.mark.integration
def test_m2_job_detail_by_id(gateway_url, check_gateway_health):
    """M2-JOB-003: Verifies fetching full job details by job_id."""
    feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=1", timeout=10.0)
    assert feed_res.status_code == 200
    jobs = feed_res.json()
    if not jobs:
        pytest.skip("No jobs in database to test detail endpoint")

    target_id = jobs[0]["job_id"]
    detail_res = httpx.get(f"{gateway_url}/api/v1/jobs/{target_id}", timeout=10.0)
    assert detail_res.status_code == 200, f"Expected 200 for job detail, got {detail_res.status_code}"
    detail = detail_res.json()
    assert detail["job_id"] == target_id
    assert "job_description" in detail, "Job detail must contain job_description"
    assert "company" in detail, "Job detail must contain company information"
    assert "currency" in detail, "Job detail must contain currency"

@pytest.mark.integration
def test_m2_job_detail_invalid_uuid_rejected(gateway_url, check_gateway_health):
    """M2-JOB-004: Verifies that non-UUID string in job_id returns 400 Bad Request."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs/invalid-not-a-uuid", timeout=10.0)
    assert res.status_code in (400, 422), f"Expected 400/422 for invalid UUID, got {res.status_code}"

@pytest.mark.integration
def test_m2_job_detail_non_existent_uuid_404(gateway_url, check_gateway_health):
    """M2-JOB-005: Verifies that valid UUID not in database returns 404 Not Found."""
    random_uuid = str(uuid.uuid4())
    res = httpx.get(f"{gateway_url}/api/v1/jobs/{random_uuid}", timeout=10.0)
    assert res.status_code == 404, f"Expected 404 for missing job, got {res.status_code}"

@pytest.mark.integration
def test_m2_job_freshness_fields(gateway_url, check_gateway_health):
    """M2-JOB-006: Verifies job freshness indicators are present in job summary."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=5", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    if not jobs:
        pytest.skip("No jobs in database to test freshness")
    for job in jobs:
        assert "posted_at" in job or "posted_at_raw" in job, "Freshness posted_at indicator required"
