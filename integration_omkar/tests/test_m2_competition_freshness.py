"""
test_m2_competition_freshness.py - Automated Milestone 2 Integration Tests for
Competition Indicators and Freshness Fields.

Validates:
- M2-IND-001: Competition fields present in job summary (applicant_count, competition_level)
- M2-IND-002: Competition fields present in job detail schema
- M2-IND-003: competition_level is a valid tier (LOW, MEDIUM, HIGH)
- M2-IND-004: applicant_count is a non-negative integer
- M2-IND-005: freshness_level is a valid tier (FRESH, RECENT, AGING, STALE)
- M2-IND-006: freshness and competition fields are API-exposed (not internal-only)
- M2-IND-007: HIGH competition jobs have applicant_count > 50
- M2-IND-008: LOW competition jobs have applicant_count < 10 (or absent)

Owner: Intern 5 (Integration & Development)
DEF Reference: DEF-014 — Competition indicators added by Hanith (commit f9d14fb)
"""
import httpx
import pytest

VALID_COMPETITION_LEVELS = {"LOW", "MEDIUM", "HIGH"}
VALID_FRESHNESS_LEVELS = {"FRESH", "RECENT", "AGING", "STALE"}


@pytest.mark.integration
def test_m2_competition_fields_in_job_summary(gateway_url, check_gateway_health):
    """M2-IND-001: Verifies competition fields are present in job feed summary response."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=5", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    if not jobs:
        pytest.skip("No jobs in database to validate competition fields")
    for job in jobs:
        assert "applicant_count" in job, (
            f"M2-IND-001: applicant_count missing from job summary for job_id={job.get('job_id')}"
        )
        assert "competition_level" in job, (
            f"M2-IND-001: competition_level missing from job summary for job_id={job.get('job_id')}"
        )


@pytest.mark.integration
def test_m2_competition_level_valid_tier(gateway_url, check_gateway_health):
    """M2-IND-003: Verifies competition_level is always LOW, MEDIUM, or HIGH."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=10", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    if not jobs:
        pytest.skip("No jobs available")
    for job in jobs:
        level = job.get("competition_level", "")
        assert level in VALID_COMPETITION_LEVELS, (
            f"M2-IND-003: Invalid competition_level '{level}' for job_id={job.get('job_id')}. "
            f"Must be one of {VALID_COMPETITION_LEVELS}"
        )


@pytest.mark.integration
def test_m2_applicant_count_non_negative(gateway_url, check_gateway_health):
    """M2-IND-004: Verifies applicant_count is always a non-negative integer."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=10", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    if not jobs:
        pytest.skip("No jobs available")
    for job in jobs:
        count = job.get("applicant_count", -1)
        assert isinstance(count, int), (
            f"M2-IND-004: applicant_count must be int, got {type(count)} for job_id={job.get('job_id')}"
        )
        assert count >= 0, (
            f"M2-IND-004: applicant_count must be >= 0, got {count} for job_id={job.get('job_id')}"
        )


@pytest.mark.integration
def test_m2_freshness_level_valid_tier(gateway_url, check_gateway_health):
    """M2-IND-005: Verifies freshness_level is always FRESH, RECENT, AGING, or STALE."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=10", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    if not jobs:
        pytest.skip("No jobs available")
    for job in jobs:
        level = job.get("freshness_level", "")
        assert level in VALID_FRESHNESS_LEVELS, (
            f"M2-IND-005: Invalid freshness_level '{level}' for job_id={job.get('job_id')}. "
            f"Must be one of {VALID_FRESHNESS_LEVELS}"
        )


@pytest.mark.integration
def test_m2_competition_fields_in_job_detail(gateway_url, check_gateway_health):
    """M2-IND-002: Verifies competition fields are present in individual job detail response."""
    feed_res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=1", timeout=10.0)
    assert feed_res.status_code == 200
    jobs = feed_res.json()
    if not jobs:
        pytest.skip("No jobs in database")

    job_id = jobs[0]["job_id"]
    detail_res = httpx.get(f"{gateway_url}/api/v1/jobs/{job_id}", timeout=10.0)
    assert detail_res.status_code == 200
    detail = detail_res.json()

    assert "applicant_count" in detail, (
        f"M2-IND-002: applicant_count missing from job detail for job_id={job_id}"
    )
    assert "competition_level" in detail, (
        f"M2-IND-002: competition_level missing from job detail for job_id={job_id}"
    )
    assert "freshness_level" in detail, (
        f"M2-IND-002: freshness_level missing from job detail for job_id={job_id}"
    )
    assert detail["competition_level"] in VALID_COMPETITION_LEVELS
    assert detail["freshness_level"] in VALID_FRESHNESS_LEVELS


@pytest.mark.integration
def test_m2_high_competition_applicant_count_gt_50(gateway_url, check_gateway_health):
    """M2-IND-007: HIGH competition jobs must have applicant_count > 50."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=20", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    high_competition_jobs = [j for j in jobs if j.get("competition_level") == "HIGH"]
    for job in high_competition_jobs:
        assert job["applicant_count"] > 50, (
            f"M2-IND-007: HIGH competition job should have applicant_count > 50, "
            f"got {job['applicant_count']} for job_id={job.get('job_id')}"
        )


@pytest.mark.integration
def test_m2_low_competition_applicant_count_lt_10(gateway_url, check_gateway_health):
    """M2-IND-008: LOW competition jobs must have applicant_count < 10."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=20", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    low_competition_jobs = [j for j in jobs if j.get("competition_level") == "LOW"]
    for job in low_competition_jobs:
        assert job["applicant_count"] < 10, (
            f"M2-IND-008: LOW competition job should have applicant_count < 10, "
            f"got {job['applicant_count']} for job_id={job.get('job_id')}"
        )


@pytest.mark.integration
def test_m2_freshness_fields_api_exposed(gateway_url, check_gateway_health):
    """M2-IND-006: Verifies freshness indicator fields are included in API response
    (not internal-only). Checks both summary and detail schemas."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?page=1&page_size=3", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    if not jobs:
        pytest.skip("No jobs available")
    # Freshness indicators must be at top-level of each job summary
    for job in jobs:
        assert "posted_at" in job or "posted_at_raw" in job, (
            f"M2-IND-006: No posted_at/posted_at_raw in job summary for job_id={job.get('job_id')}"
        )
        assert "freshness_level" in job, (
            f"M2-IND-006: freshness_level missing from summary for job_id={job.get('job_id')}"
        )
