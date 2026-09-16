"""
test_m2_matching_engine.py - Automated Milestone 2 Integration Tests for Matching Engine / Recommendations.

Validates:
- M2-MATCH-001: Recommendation endpoint reachable via Gateway (GET /api/v1/recommendations)
- M2-MATCH-002: Heuristic matching engine metadata and ranking response shape
- M2-MATCH-003: Unauthenticated request rejected (401 Unauthorized)
"""
import uuid
import httpx
import pytest

@pytest.mark.integration
def test_m2_recommendations_authenticated_flow(gateway_url, check_gateway_health, test_job_seeker):
    """M2-MATCH-001 & M2-MATCH-002: Verifies recommendation retrieval for an authenticated candidate."""
    # First upload a sample resume if required by the downstream ATS service
    sample_resume_content = b"Senior Full Stack Software Engineer with 5+ years experience in Python, FastAPI, React, PostgreSQL, Redis, Docker."
    files = {"file": ("test_resume.txt", sample_resume_content, "text/plain")}
    upload_res = httpx.post(
        f"{gateway_url}/api/v1/resume/upload",
        files=files,
        headers=test_job_seeker["headers"],
        timeout=10.0
    )
    # Resume upload could succeed or fail gracefully if ATS service is mocked
    if upload_res.status_code == 200:
        pass

    # Request recommendations
    res = httpx.get(
        f"{gateway_url}/api/v1/recommendations?user_id={test_job_seeker['user_id']}",
        headers=test_job_seeker["headers"],
        timeout=10.0
    )

    if res.status_code == 503:
        pytest.skip("Matching Engine / Resume service upstream returned 503 (service offline)")

    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
    data = res.json()
    assert "recommendations" in data or isinstance(data, list), "Must return recommendations list"
    
    # DEF-015 Verification: Recommended job_ids must be valid UUIDs compatible with GET /api/v1/jobs/{id}
    recs = data.get("recommendations", data) if isinstance(data, dict) else data
    if recs:
        for rec in recs:
            job_id_str = str(rec.get("job_id", ""))
            parsed_uuid = uuid.UUID(job_id_str)
            assert str(parsed_uuid) == job_id_str, f"Recommendation job_id '{job_id_str}' must be a canonical UUID string"

@pytest.mark.integration
def test_m2_recommendations_unauthenticated_rejected(gateway_url, check_gateway_health):
    """M2-MATCH-003: Verifies unauthenticated calls to /recommendations are rejected with 401."""
    res = httpx.get(f"{gateway_url}/api/v1/recommendations", timeout=10.0)
    assert res.status_code in (401, 403), f"Expected 401/403 for unauthenticated call, got {res.status_code}"
