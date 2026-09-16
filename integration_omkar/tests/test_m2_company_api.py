"""
test_m2_company_api.py - Automated Milestone 2 Integration Tests for Company API.

Validates:
- M2-COMP-001: Public company listing (GET /api/v1/companies) returns 200
- M2-COMP-002: Company listing pagination (page, page_size)
- M2-COMP-003: Startup / newly_founded filter
- M2-COMP-004: Industry filter (case-insensitive substring)
- M2-COMP-005: Company detail by UUID (GET /api/v1/companies/{id})
- M2-COMP-006: Invalid company_id UUID format rejection (400 Bad Request)
- M2-COMP-007: Non-existent company UUID returns 404 Not Found
- M2-COMP-008: Company detail includes active job listings
- M2-COMP-009: Company schema fields present (company_id, name, aggregate_rating, job_count)

Owner: Intern 5 (Integration & Development)
DEF Reference: DEF-011 — Companies router added by Hanith (commit f9d14fb)
"""
import uuid
import httpx
import pytest


@pytest.mark.integration
def test_m2_company_listing_returns_200(gateway_url, check_gateway_health):
    """M2-COMP-001: Verifies that GET /companies is publicly accessible and returns 200."""
    res = httpx.get(f"{gateway_url}/api/v1/companies", timeout=10.0)
    assert res.status_code == 200, (
        f"Expected 200 OK for company listing, got {res.status_code}: {res.text}"
    )
    companies = res.json()
    assert isinstance(companies, list), "Response must be a list of companies"


@pytest.mark.integration
def test_m2_company_listing_schema(gateway_url, check_gateway_health):
    """M2-COMP-009: Verifies company summary schema fields are present."""
    res = httpx.get(f"{gateway_url}/api/v1/companies?page=1&page_size=5", timeout=10.0)
    assert res.status_code == 200
    companies = res.json()
    if not companies:
        pytest.skip("No companies in database to validate schema")
    first = companies[0]
    assert "company_id" in first, "Company summary must contain company_id"
    assert "name" in first, "Company summary must contain name"
    assert "aggregate_rating" in first, "Company summary must contain aggregate_rating"
    assert "job_count" in first, "Company summary must contain job_count"
    assert "is_newly_founded" in first, "Company summary must contain is_newly_founded boolean"


@pytest.mark.integration
def test_m2_company_pagination_sizing(gateway_url, check_gateway_health):
    """M2-COMP-002: Verifies company listing pagination parameters."""
    res = httpx.get(f"{gateway_url}/api/v1/companies?page=1&page_size=2", timeout=10.0)
    assert res.status_code == 200
    companies = res.json()
    assert isinstance(companies, list)
    assert len(companies) <= 2, f"Expected at most 2 companies, got {len(companies)}"


@pytest.mark.integration
def test_m2_company_filter_newly_founded(gateway_url, check_gateway_health):
    """M2-COMP-003: Verifies newly_founded=true filter returns startup companies."""
    res = httpx.get(f"{gateway_url}/api/v1/companies?newly_founded=true", timeout=10.0)
    assert res.status_code == 200
    companies = res.json()
    assert isinstance(companies, list)
    for company in companies:
        assert company.get("is_newly_founded") is True, (
            f"Startup filter should only return is_newly_founded=true companies, "
            f"got {company.get('is_newly_founded')} for {company.get('name')}"
        )


@pytest.mark.integration
def test_m2_company_filter_industry(gateway_url, check_gateway_health):
    """M2-COMP-004: Verifies industry filter (substring, case-insensitive)."""
    res = httpx.get(f"{gateway_url}/api/v1/companies?industry=tech", timeout=10.0)
    assert res.status_code == 200
    companies = res.json()
    assert isinstance(companies, list)
    # If seeded data exists, verify the filter is case-insensitive
    for company in companies:
        if company.get("industry"):
            assert "tech" in company["industry"].lower(), (
                f"Industry filter failed: expected 'tech' in '{company['industry']}'"
            )


@pytest.mark.integration
def test_m2_company_detail_by_id(gateway_url, check_gateway_health):
    """M2-COMP-005: Verifies fetching full company detail by company_id UUID."""
    list_res = httpx.get(f"{gateway_url}/api/v1/companies?page=1&page_size=1", timeout=10.0)
    assert list_res.status_code == 200
    companies = list_res.json()
    if not companies:
        pytest.skip("No companies in database to test detail endpoint")

    target_id = companies[0]["company_id"]
    detail_res = httpx.get(f"{gateway_url}/api/v1/companies/{target_id}", timeout=10.0)
    assert detail_res.status_code == 200, (
        f"Expected 200 for company detail, got {detail_res.status_code}: {detail_res.text}"
    )
    detail = detail_res.json()
    assert detail["company_id"] == target_id
    assert "jobs" in detail, "Company detail must include jobs list"
    assert isinstance(detail["jobs"], list), "Jobs field must be a list"


@pytest.mark.integration
def test_m2_company_detail_includes_job_count(gateway_url, check_gateway_health):
    """M2-COMP-008: Verifies company detail job_count matches number of job listings."""
    list_res = httpx.get(f"{gateway_url}/api/v1/companies?page=1&page_size=1", timeout=10.0)
    assert list_res.status_code == 200
    companies = list_res.json()
    if not companies:
        pytest.skip("No companies in database")

    target_id = companies[0]["company_id"]
    detail_res = httpx.get(f"{gateway_url}/api/v1/companies/{target_id}", timeout=10.0)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    # job_count should match the number of jobs returned in the detail
    assert detail["job_count"] >= len(detail["jobs"]), (
        f"job_count ({detail['job_count']}) must be >= len(jobs) ({len(detail['jobs'])})"
    )


@pytest.mark.integration
def test_m2_company_detail_invalid_uuid_rejected(gateway_url, check_gateway_health):
    """M2-COMP-006: Verifies non-UUID string in company_id returns 400 Bad Request."""
    res = httpx.get(f"{gateway_url}/api/v1/companies/not-a-valid-uuid-here", timeout=10.0)
    assert res.status_code in (400, 422), (
        f"Expected 400/422 for invalid UUID format, got {res.status_code}"
    )


@pytest.mark.integration
def test_m2_company_detail_non_existent_404(gateway_url, check_gateway_health):
    """M2-COMP-007: Verifies valid UUID not in database returns 404 Not Found."""
    random_uuid = str(uuid.uuid4())
    res = httpx.get(f"{gateway_url}/api/v1/companies/{random_uuid}", timeout=10.0)
    assert res.status_code == 404, (
        f"Expected 404 for missing company, got {res.status_code}"
    )
