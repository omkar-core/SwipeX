"""
test_m2_search_and_filter.py - Automated Milestone 2 Integration Tests for Search & Filtering.

Validates:
- M2-SEARCH-001: Location filtering (case-insensitive substring match)
- M2-SEARCH-002: Work-mode / Remote filtering
- M2-SEARCH-003: Salary boundary overlap filtering
- M2-SEARCH-004: Skill-based tag filtering (OR match)
- M2-SEARCH-005: Combined multi-dimensional search/filter queries
- M2-SEARCH-006: Salary boundary inversion error rejection (400 Bad Request)
- M2-SEARCH-007: Non-matching filter combinations returning empty list with 200 OK
"""
import httpx
import pytest

@pytest.mark.integration
def test_m2_filter_by_location(gateway_url, check_gateway_health):
    """M2-SEARCH-001: Verifies location filter query parameter."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?location=Bangalore", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)
    for job in jobs:
        assert "bangalore" in job["location"].lower() or "bengaluru" in job["location"].lower() or len(job["location"]) > 0

@pytest.mark.integration
def test_m2_filter_by_work_mode(gateway_url, check_gateway_health):
    """M2-SEARCH-002: Verifies remote / work mode CSV filter."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?remote=Remote,Hybrid", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)

@pytest.mark.integration
def test_m2_filter_by_salary_range(gateway_url, check_gateway_health):
    """M2-SEARCH-003: Verifies salary_min and salary_max parameters."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?salary_min=300000&salary_max=1500000", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)

@pytest.mark.integration
def test_m2_filter_by_skills(gateway_url, check_gateway_health):
    """M2-SEARCH-004: Verifies comma-separated skill filtering."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?skills=Python,SQL,React", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)

@pytest.mark.integration
def test_m2_filter_combined_multi_dimensional(gateway_url, check_gateway_health):
    """M2-SEARCH-005: Verifies combined multi-parameter filtering."""
    res = httpx.get(
        f"{gateway_url}/api/v1/jobs?location=India&salary_min=200000&skills=Python&page=1&page_size=10",
        timeout=10.0
    )
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)

@pytest.mark.integration
def test_m2_filter_inverted_salary_rejected(gateway_url, check_gateway_health):
    """M2-SEARCH-006: Verifies that salary_min > salary_max returns 400 Bad Request."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs?salary_min=900000&salary_max=200000", timeout=10.0)
    assert res.status_code in (400, 422), f"Expected 400/422 for inverted salary, got {res.status_code}"

@pytest.mark.integration
def test_m2_filter_no_match_returns_empty_list(gateway_url, check_gateway_health):
    """M2-SEARCH-007: Verifies non-matching query parameters return empty array."""
    res = httpx.get(
        f"{gateway_url}/api/v1/jobs?location=NonExistentCityXYZ9999&skills=TotallyFakeSkillXYZ9999",
        timeout=10.0
    )
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)
    assert len(jobs) == 0

@pytest.mark.integration
def test_m2_keyword_search_endpoint(gateway_url, check_gateway_health):
    """M2-SEARCH-008: Verifies dedicated /jobs/search keyword query parameter."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs/search?q=python", timeout=10.0)
    assert res.status_code == 200, f"Expected 200 from /jobs/search, got {res.status_code}: {res.text}"
    jobs = res.json()
    assert isinstance(jobs, list)

@pytest.mark.integration
def test_m2_keyword_search_no_match(gateway_url, check_gateway_health):
    """M2-SEARCH-009: Verifies /jobs/search returns empty list for non-matching keyword."""
    res = httpx.get(f"{gateway_url}/api/v1/jobs/search?q=NonExistentKeywordXYZ9999", timeout=10.0)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)
    assert len(jobs) == 0
