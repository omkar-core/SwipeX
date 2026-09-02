"""
Automated Verification Test Suite for Swipe Service API Endpoints (POST /api/v1/swipes & GET /api/v1/swipes/history).
Tests all 19 required swipe security, RBAC, header forgery prevention, database integrity, and history isolation scenarios.
"""
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

# Add data_hanith to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVICE_DIR = os.path.join(BASE_DIR, "data_hanith")
sys.path.insert(0, SERVICE_DIR)

from config import RAW_DATASET1_PATH, DATABASE_URL
from scripts.ingest_dataset1 import run_ingestion
from main import app
from db.connection import get_raw_connection, init_db
from api.dependencies import create_test_jwt, GATEWAY_SHARED_SECRET


@pytest.fixture(scope="module")
def api_client():
    """
    Initializes test database and returns FastAPI TestClient instance.
    """
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    schema_sql_path = os.path.join(SERVICE_DIR, "db", "schema.sql")
    init_db(db_url, schema_sql_path)

    # Ensure dataset is ingested
    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM jobs;")
    job_count = cur.fetchone()[0]
    cur.close()
    conn.close()

    if job_count == 0:
        run_ingestion(dataset_path=RAW_DATASET1_PATH, db_url=db_url)

    client = TestClient(app)
    yield client


@pytest.fixture(scope="module")
def valid_job_id(api_client):
    """
    Retrieves a valid job_id UUID from the database.
    """
    response = api_client.get("/api/v1/jobs?page_size=1")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) > 0
    return jobs[0]["job_id"]


@pytest.fixture(scope="module")
def second_job_id(api_client):
    """
    Retrieves a second distinct valid job_id UUID from the database.
    """
    response = api_client.get("/api/v1/jobs?page=1&page_size=2")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) >= 2
    return jobs[1]["job_id"]


def auth_header(user_id: str, role: str = "Job Seeker") -> dict:
    """Helper to generate Bearer authorization token header using standard 3-part JWT."""
    jwt_token = create_test_jwt(user_id, role)
    return {"Authorization": f"Bearer {jwt_token}"}


# 1. Valid RIGHT swipe -> 201 Created
def test_valid_right_swipe(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert "swipe_id" in data
    assert uuid.UUID(data["swipe_id"])  # Valid UUID


# 2. Valid LEFT swipe -> 201 Created
def test_valid_left_swipe(api_client, second_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": second_job_id, "direction": "LEFT"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert "swipe_id" in data


# 3. Swipe stored with authenticated user_id
def test_swipe_stored_with_authenticated_user_id(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    res_post = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert res_post.status_code == 201

    res_hist = api_client.get("/api/v1/swipes/history", headers=headers)
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) == 1
    assert history[0]["job_id"] == valid_job_id
    assert history[0]["direction"] == "RIGHT"


# 4. Missing authentication -> 401 Unauthorized
def test_missing_authentication(api_client, valid_job_id):
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}
    response = api_client.post("/api/v1/swipes", json=payload)
    assert response.status_code == 401


# 5. Invalid authentication -> 401 Unauthorized
def test_invalid_authentication(api_client, valid_job_id):
    headers = {"Authorization": "Bearer invalid_garbage_token_without_claims"}
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}
    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code == 401


# 6. Authenticated Recruiter -> 403 Forbidden
def test_recruiter_forbidden(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Recruiter")
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code == 403
    assert "forbidden" in response.json()["detail"].lower() or "required role" in response.json()["detail"].lower()


# 7. Authenticated Admin -> 403 Forbidden
def test_admin_forbidden(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Admin")
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code == 403


# 8. Authenticated Job Seeker -> allowed
def test_job_seeker_allowed(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": valid_job_id, "direction": "LEFT"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code == 201


# 9. Invalid job UUID format -> 422 / 400
def test_invalid_job_uuid_format(api_client):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": "not-a-valid-uuid", "direction": "RIGHT"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code in (400, 422)


# 10. Nonexistent job UUID -> 404 Not Found
def test_nonexistent_job_uuid(api_client):
    user_id = str(uuid.uuid4())
    random_job_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": random_job_id, "direction": "RIGHT"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# 11. Invalid direction -> 422 / 400
def test_invalid_direction(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": valid_job_id, "direction": "UP"}

    response = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert response.status_code in (400, 422)


# 12. Duplicate user/job swipe -> 409 Conflict
def test_duplicate_swipe_conflict(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    # First swipe -> 201
    res1 = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert res1.status_code == 201

    # Second swipe for same user & job -> 409 Conflict
    res2 = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert res2.status_code == 409
    assert "already swiped" in res2.json()["detail"].lower()


# 13. Swipe history -> 200 OK
def test_swipe_history_basic(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")

    api_client.post("/api/v1/swipes", json={"job_id": valid_job_id, "direction": "RIGHT"}, headers=headers)

    response = api_client.get("/api/v1/swipes/history", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert "job_id" in data[0]
    assert "direction" in data[0]
    assert "swiped_at" in data[0]


# 14 & 15. History contains only authenticated user's swipes / User A cannot access User B's history
def test_swipe_history_isolation(api_client, valid_job_id, second_job_id):
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    headers_a = auth_header(user_a, "Job Seeker")
    headers_b = auth_header(user_b, "Job Seeker")

    # User A swipes job 1
    api_client.post("/api/v1/swipes", json={"job_id": valid_job_id, "direction": "RIGHT"}, headers=headers_a)

    # User B swipes job 2
    api_client.post("/api/v1/swipes", json={"job_id": second_job_id, "direction": "LEFT"}, headers=headers_b)

    # User A checks history -> only job 1
    res_a = api_client.get("/api/v1/swipes/history", headers=headers_a)
    assert res_a.status_code == 200
    hist_a = res_a.json()
    assert len(hist_a) == 1
    assert hist_a[0]["job_id"] == valid_job_id

    # User B checks history -> only job 2
    res_b = api_client.get("/api/v1/swipes/history", headers=headers_b)
    assert res_b.status_code == 200
    hist_b = res_b.json()
    assert len(hist_b) == 1
    assert hist_b[0]["job_id"] == second_job_id


# 16. History ordering is deterministic (newest first)
def test_swipe_history_deterministic_order(api_client, valid_job_id, second_job_id):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")

    api_client.post("/api/v1/swipes", json={"job_id": valid_job_id, "direction": "RIGHT"}, headers=headers)
    api_client.post("/api/v1/swipes", json={"job_id": second_job_id, "direction": "LEFT"}, headers=headers)

    response = api_client.get("/api/v1/swipes/history", headers=headers)
    assert response.status_code == 200
    history = response.json()
    assert len(history) == 2
    # Newest swipe (second_job_id) should be first
    assert history[0]["job_id"] == second_job_id
    assert history[1]["job_id"] == valid_job_id


# 17. Client cannot supply user_id in payload to impersonate another user
def test_client_cannot_supply_user_id_in_body(api_client, valid_job_id):
    victim_user_id = str(uuid.uuid4())
    attacker_user_id = str(uuid.uuid4())

    headers_attacker = auth_header(attacker_user_id, "Job Seeker")
    headers_victim = auth_header(victim_user_id, "Job Seeker")

    # Attacker tries to inject victim's user_id into request body
    payload = {
        "job_id": valid_job_id,
        "direction": "RIGHT",
        "user_id": victim_user_id
    }

    res_swipe = api_client.post("/api/v1/swipes", json=payload, headers=headers_attacker)
    assert res_swipe.status_code == 201

    # Check victim history -> must be empty!
    res_victim_hist = api_client.get("/api/v1/swipes/history", headers=headers_victim)
    assert res_victim_hist.status_code == 200
    assert len(res_victim_hist.json()) == 0

    # Check attacker history -> swipe was recorded under attacker!
    res_attacker_hist = api_client.get("/api/v1/swipes/history", headers=headers_attacker)
    assert res_attacker_hist.status_code == 200
    assert len(res_attacker_hist.json()) == 1


# 18. Direct client header forgery (X-User-Id / X-User-Role) is REJECTED (401 Unauthorized)
def test_untrusted_client_header_forgery_rejected(api_client, valid_job_id):
    forged_user_id = str(uuid.uuid4())
    forged_headers = {
        "X-User-Id": forged_user_id,
        "X-User-Role": "Job Seeker"
    }
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    # Without X-Gateway-Secret, direct header forgery must be rejected with 401 Unauthorized
    res = api_client.post("/api/v1/swipes", json=payload, headers=forged_headers)
    assert res.status_code == 401
    assert "untrusted client identity header" in res.json()["detail"].lower()


# 19. Trusted API Gateway headers support (with X-Gateway-Secret)
def test_trusted_api_gateway_headers_support(api_client, valid_job_id):
    gw_user_id = str(uuid.uuid4())
    gw_headers = {
        "X-User-Id": gw_user_id,
        "X-User-Role": "Job Seeker",
        "X-Gateway-Secret": GATEWAY_SHARED_SECRET
    }
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    res = api_client.post("/api/v1/swipes", json=payload, headers=gw_headers)
    assert res.status_code == 201

    res_hist = api_client.get("/api/v1/swipes/history", headers=gw_headers)
    assert res_hist.status_code == 200
    assert len(res_hist.json()) == 1
    assert res_hist.json()[0]["job_id"] == valid_job_id


# 20. Gateway canonical role string ("job_seeker") is accepted on protected swipe endpoints
def test_canonical_gateway_job_seeker_role_accepted(api_client, valid_job_id):
    user_id = str(uuid.uuid4())
    # Create Bearer JWT with exact Gateway role string "job_seeker"
    headers = auth_header(user_id, role="job_seeker")
    payload = {"job_id": valid_job_id, "direction": "RIGHT"}

    # Swipe POST must succeed with 201 Created
    res_swipe = api_client.post("/api/v1/swipes", json=payload, headers=headers)
    assert res_swipe.status_code == 201
    assert "swipe_id" in res_swipe.json()

    # History GET must succeed with 200 OK
    res_hist = api_client.get("/api/v1/swipes/history", headers=headers)
    assert res_hist.status_code == 200
    assert len(res_hist.json()) == 1
    assert res_hist.json()[0]["job_id"] == valid_job_id

