"""
Day 3 checklist: "Role rule (RBAC) added & tested"
Day 4 checklist: "Tested with different user roles"

Run with:  pytest -v   (from the auth-service folder, inside your venv)

Uses a throwaway SQLite file so it never touches your real dev database.
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_auth.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine


@pytest.fixture(autouse=True)
def fresh_db():
    """Wipes and recreates tables before every test, so tests don't leak state."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def test_register_and_login():
    r = client.post("/api/v1/auth/register", json={
        "name": "Asha Rao", "email": "asha@example.com",
        "password": "supersecret123", "role": "job_seeker",
    })
    assert r.status_code == 201
    assert "user_id" in r.json()

    r = client.post("/api/v1/auth/login", json={
        "email": "asha@example.com", "password": "supersecret123",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "job_seeker"
    assert "access_token" in body and "refresh_token" in body


def test_duplicate_email_rejected():
    payload = {"name": "A", "email": "dup@example.com", "password": "pw1234567", "role": "job_seeker"}
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


def test_wrong_password_rejected():
    client.post("/api/v1/auth/register", json={
        "name": "B", "email": "b@example.com", "password": "correct-password", "role": "job_seeker",
    })
    r = client.post("/api/v1/auth/login", json={"email": "b@example.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_me_requires_valid_token():
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 403  # no Authorization header at all

    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


def test_me_returns_correct_user():
    client.post("/api/v1/auth/register", json={
        "name": "Chetan", "email": "chetan@example.com", "password": "mypassword1", "role": "recruiter",
    })
    login = client.post("/api/v1/auth/login", json={"email": "chetan@example.com", "password": "mypassword1"})
    token = login.json()["access_token"]

    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["name"] == "Chetan"
    assert r.json()["role"] == "recruiter"


def test_refresh_token_issues_new_access_token():
    client.post("/api/v1/auth/register", json={
        "name": "D", "email": "d@example.com", "password": "password123", "role": "job_seeker",
    })
    login = client.post("/api/v1/auth/login", json={"email": "d@example.com", "password": "password123"})
    refresh_token = login.json()["refresh_token"]

    r = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_refresh_rejects_bogus_token():
    r = client.post("/api/v1/auth/refresh", json={"refresh_token": "totally-made-up"})
    assert r.status_code == 401


def test_rbac_blocks_wrong_role_on_swipe_gateway_route():
    """
    Only 'job_seeker' role can hit POST /api/v1/swipes (per require_role
    in gateway.py). A recruiter account should get a 403, proving RBAC
    is actually enforced and not just decorative.
    """
    client.post("/api/v1/auth/register", json={
        "name": "Recruiter Rita", "email": "rita@example.com", "password": "recruiterpw1", "role": "recruiter",
    })
    login = client.post("/api/v1/auth/login", json={"email": "rita@example.com", "password": "recruiterpw1"})
    token = login.json()["access_token"]

    r = client.post(
        "/api/v1/swipes",
        json={"job_id": "some-job-id", "direction": "right"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
