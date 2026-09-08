"""
conftest.py - Pytest configuration and fixtures for live E2E integration testing.
"""
import os
import uuid
import pytest
import httpx

GATEWAY_BASE_URL = os.environ.get("GATEWAY_BASE_URL", "http://localhost:8001")

@pytest.fixture(scope="session")
def gateway_url():
    return GATEWAY_BASE_URL

@pytest.fixture(scope="session")
def check_gateway_health(gateway_url):
    """Ensures Gateway is running before executing test suite."""
    try:
        res = httpx.get(f"{gateway_url}/health", timeout=3.0)
        assert res.status_code == 200, f"Gateway health check returned {res.status_code}"
    except Exception as e:
        pytest.skip(f"Live Gateway not reachable at {gateway_url}: {e}")

@pytest.fixture(scope="function")
def test_job_seeker(gateway_url, check_gateway_health):
    """Registers and authenticates a temporary job seeker user, returning credentials and token."""
    unique_id = uuid.uuid4().hex[:8]
    email = f"seeker_{unique_id}@swipex-test.com"
    password = "TestPassword123!"
    name = f"Job Seeker {unique_id}"

    # 1. Register
    reg_res = httpx.post(f"{gateway_url}/api/v1/auth/register", json={
        "name": name,
        "email": email,
        "password": password,
        "role": "job_seeker"
    }, timeout=5.0)
    assert reg_res.status_code == 201, f"Failed to register seeker: {reg_res.text}"
    user_id = reg_res.json()["user_id"]

    # 2. Login
    login_res = httpx.post(f"{gateway_url}/api/v1/auth/login", json={
        "email": email,
        "password": password
    }, timeout=5.0)
    assert login_res.status_code == 200, f"Failed to login seeker: {login_res.text}"
    token_data = login_res.json()
    token = token_data["access_token"]

    return {
        "user_id": user_id,
        "name": name,
        "email": email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }

@pytest.fixture(scope="function")
def test_recruiter(gateway_url, check_gateway_health):
    """Registers and authenticates a temporary recruiter user."""
    unique_id = uuid.uuid4().hex[:8]
    email = f"recruiter_{unique_id}@swipex-test.com"
    password = "TestPassword123!"
    name = f"Recruiter {unique_id}"

    reg_res = httpx.post(f"{gateway_url}/api/v1/auth/register", json={
        "name": name,
        "email": email,
        "password": password,
        "role": "recruiter"
    }, timeout=5.0)
    assert reg_res.status_code == 201, f"Failed to register recruiter: {reg_res.text}"
    user_id = reg_res.json()["user_id"]

    login_res = httpx.post(f"{gateway_url}/api/v1/auth/login", json={
        "email": email,
        "password": password
    }, timeout=5.0)
    assert login_res.status_code == 200, f"Failed to login recruiter: {login_res.text}"
    token = login_res.json()["access_token"]

    return {
        "user_id": user_id,
        "name": name,
        "email": email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }
