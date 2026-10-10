"""
test_gateway_route_contract.py - Automated Gateway Route Contract Verification
Owned by Intern 5 (Platform, Testing & Deployment).

Verifies that EVERY frozen contract endpoint documented in M2, M3, and M4 contracts
is properly registered and routed at the API Gateway.
Prevents route rename mismatches (e.g., /resume vs /resumes) permanently.

Contract Rule:
For every public contract path, the gateway MUST NOT return 404 Not Found.
(200, 400, 401, 403, 405, 422, 502, 503 are all valid responses indicating the route exists).
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "backend_mansi"))

from backend_mansi.app.main import app

client = TestClient(app)

CONTRACT_ROUTES = [
    # M2 Auth & Gateway
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("GET", "/api/v1/auth/me"),
    ("POST", "/api/v1/auth/refresh"),
    
    # M2 Jobs
    ("GET", "/api/v1/jobs"),
    ("GET", "/api/v1/jobs/search"),
    ("GET", "/api/v1/jobs/test-id-123"),
    ("POST", "/api/v1/jobs"),
    
    # M2 Swipes
    ("POST", "/api/v1/swipes"),
    ("GET", "/api/v1/swipes/history"),
    
    # M2 Companies
    ("GET", "/api/v1/companies"),
    ("GET", "/api/v1/companies/test-comp-123"),
    
    # M2 & M3 Recommendations
    ("GET", "/api/v1/recommendations"),
    
    # M3 Resume Service (Plural and Singular compatibility)
    ("POST", "/api/v1/resumes/upload"),
    ("POST", "/api/v1/resume/upload"),
    ("GET", "/api/v1/resumes"),
    ("GET", "/api/v1/resumes/test-resume-123"),
    ("POST", "/api/v1/resumes/test-resume-123/parse"),
    
    # M3 ATS Scoring
    ("POST", "/api/v1/ats/score"),
    
    # M4 Notifications
    ("GET", "/api/v1/notifications"),
    ("GET", "/api/v1/notifications/unread-count"),
    ("PATCH", "/api/v1/notifications/test-notif-123/read"),
    ("POST", "/api/v1/notifications/mark-all-read"),
    ("GET", "/api/v1/notifications/preferences"),
    ("PUT", "/api/v1/notifications/preferences"),
    ("POST", "/api/v1/notifications/trigger"),
    
    # M4 Applications
    ("POST", "/api/v1/applications"),
    ("GET", "/api/v1/applications"),
    ("GET", "/api/v1/applications/test-app-123"),
    ("PATCH", "/api/v1/applications/test-app-123/status"),
    ("DELETE", "/api/v1/applications/test-app-123"),
    
    # M4 Job Competition & Freshness
    ("GET", "/api/v1/jobs/test-job-123/competition"),
    ("POST", "/api/v1/jobs/competition-batch"),
    ("GET", "/api/v1/jobs/competition-filter"),
    
    # M4 Analytics
    ("GET", "/api/v1/analytics/job-seeker"),
    ("GET", "/api/v1/analytics/recruiter"),
    ("GET", "/api/v1/analytics/admin"),
    ("GET", "/api/v1/analytics/hiring-trends"),
]


@pytest.mark.parametrize("method,path", CONTRACT_ROUTES)
def test_gateway_route_is_registered_and_not_404(method, path):
    """
    Assert that the gateway route is registered and never returns 404.
    A 404 indicates a broken routing table or endpoint name mismatch.
    """
    if method == "GET":
        response = client.get(path)
    elif method == "POST":
        response = client.post(path, json={})
    elif method == "PATCH":
        response = client.patch(path, json={})
    elif method == "PUT":
        response = client.put(path, json={})
    elif method == "DELETE":
        response = client.delete(path)
    else:
        pytest.fail(f"Unsupported HTTP method {method}")

    assert response.status_code != 404, (
        f"Contract violation: Gateway returned 404 Not Found for {method} {path}! "
        f"The route is missing from the gateway routing table. Response: {response.text}"
    )


def test_gateway_openapi_contains_contract_routes():
    """Verify that the Gateway's OpenAPI documentation exposes all key contract paths."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema.get("paths", {})

    expected_prefixes = [
        "/api/v1/auth",
        "/api/v1/jobs",
        "/api/v1/companies",
        "/api/v1/swipes",
        "/api/v1/resumes",
        "/api/v1/ats",
        "/api/v1/notifications",
        "/api/v1/applications",
        "/api/v1/analytics",
    ]

    for prefix in expected_prefixes:
        matching = [p for p in paths if p.startswith(prefix)]
        assert len(matching) > 0, f"Gateway openapi.json missing routes for prefix: {prefix}"
