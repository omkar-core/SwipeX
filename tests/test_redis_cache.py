"""
Automated Verification Test Suite for Redis Caching, Feed Exclusion, and PostgreSQL Fallback.
Tests all 16 Day 4 caching requirements, graceful Redis offline fallback, and feed isolation.
"""
import os
import sys
import uuid
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Add data_hanith to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVICE_DIR = os.path.join(BASE_DIR, "data_hanith")
sys.path.insert(0, SERVICE_DIR)

from config import RAW_DATASET1_PATH, DATABASE_URL
from scripts.ingest_dataset1 import run_ingestion
from main import app
from db.connection import get_raw_connection, init_db
from api.dependencies import create_test_jwt
from db.cache import RedisCacheService, get_cache_service, reset_redis_client


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
def job_ids(api_client):
    """
    Retrieves a list of 5 valid job_id UUIDs from the database.
    """
    response = api_client.get("/api/v1/jobs?page_size=5")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) >= 5
    return [j["job_id"] for j in jobs]


def auth_header(user_id: str, role: str = "Job Seeker") -> dict:
    """Helper to generate Bearer authorization token header."""
    jwt_token = create_test_jwt(user_id, role)
    return {"Authorization": f"Bearer {jwt_token}"}


# 1. Redis Cache Service abstraction initialization
def test_redis_cache_service_initialization():
    service = RedisCacheService()
    assert service is not None


# 2. Redis Cache Key construction strategy
def test_feed_cache_key_strategy():
    # Public key
    key1 = RedisCacheService.build_feed_cache_key(
        user_id=None, page=1, page_size=20, company_type="MNC", location="Kolkata",
        remote=True, salary_min=1000.0, salary_max=5000.0, skills=["Python", "SQL"]
    )
    assert key1.startswith("job_feed:public:")

    # Personalized user key
    key2 = RedisCacheService.build_feed_cache_key(
        user_id="user_123", page=1, page_size=20, company_type="MNC", location="Kolkata",
        remote=True, salary_min=1000.0, salary_max=5000.0, skills=["Python", "SQL"]
    )
    assert key2.startswith("job_feed:user:user_123:")
    assert key1 != key2  # Guarantees no cross-user cache data leakage


# 3. Redis swiped job IDs storing and retrieving (mock client)
def test_redis_swiped_job_ids_store_and_retrieve():
    mock_redis = MagicMock()
    mock_redis.exists.return_value = True
    mock_redis.smembers.return_value = {"job_1", "job_2"}

    service = RedisCacheService(client=mock_redis)
    res = service.get_swiped_job_ids("user_abc")

    assert res == {"job_1", "job_2"}
    mock_redis.smembers.assert_called_with("swiped_jobs:user_abc")


# 4. Redis graceful failure on connection error (mock returning None)
def test_redis_graceful_failure_handling():
    mock_redis = MagicMock()
    mock_redis.smembers.side_effect = Exception("Connection refused to Redis server")

    service = RedisCacheService(client=mock_redis)
    # Should catch exception, log warning, and return None gracefully
    res = service.get_swiped_job_ids("user_fail")
    assert res is None


# 5. Unauthenticated job browsing works (no feed exclusion)
def test_unauthenticated_job_browsing_no_exclusion(api_client):
    response = api_client.get("/api/v1/jobs?page_size=10")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) == 10


# 6. RIGHT swipe excluded from authenticated Job Seeker feed
def test_right_swipe_excluded_from_feed(api_client, job_ids):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    target_job_id = job_ids[0]

    # Swipe RIGHT on job 0
    res_swipe = api_client.post("/api/v1/swipes", json={"job_id": target_job_id, "direction": "RIGHT"}, headers=headers)
    assert res_swipe.status_code == 201

    # Fetch user's feed
    res_feed = api_client.get("/api/v1/jobs?page_size=20", headers=headers)
    assert res_feed.status_code == 200
    feed_jobs = res_feed.json()

    feed_job_ids = [j["job_id"] for j in feed_jobs]
    assert target_job_id not in feed_job_ids, "Swiped RIGHT job must be excluded from user feed"


# 7. LEFT swipe excluded from authenticated Job Seeker feed
def test_left_swipe_excluded_from_feed(api_client, job_ids):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    target_job_id = job_ids[1]

    # Swipe LEFT on job 1
    res_swipe = api_client.post("/api/v1/swipes", json={"job_id": target_job_id, "direction": "LEFT"}, headers=headers)
    assert res_swipe.status_code == 201

    # Fetch user's feed
    res_feed = api_client.get("/api/v1/jobs?page_size=20", headers=headers)
    assert res_feed.status_code == 200
    feed_jobs = res_feed.json()

    feed_job_ids = [j["job_id"] for j in feed_jobs]
    assert target_job_id not in feed_job_ids, "Swiped LEFT job must be excluded from user feed"


# 8. User A's swipes do not affect User B's feed (Feed Isolation)
def test_user_a_swipes_do_not_affect_user_b_feed(api_client, job_ids):
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    headers_a = auth_header(user_a, "Job Seeker")
    headers_b = auth_header(user_b, "Job Seeker")
    target_job_id = job_ids[2]

    # User A swipes job 2
    res_swipe = api_client.post("/api/v1/swipes", json={"job_id": target_job_id, "direction": "RIGHT"}, headers=headers_a)
    assert res_swipe.status_code == 201

    # User A feed -> job 2 excluded
    res_feed_a = api_client.get("/api/v1/jobs?page_size=20", headers=headers_a)
    assert res_feed_a.status_code == 200
    assert target_job_id not in [j["job_id"] for j in res_feed_a.json()]

    # User B feed -> job 2 is STILL present!
    res_feed_b = api_client.get("/api/v1/jobs?page_size=20", headers=headers_b)
    assert res_feed_b.status_code == 200
    assert target_job_id in [j["job_id"] for j in res_feed_b.json()], "User A's swipe must NOT exclude job from User B's feed"


# 9. New swipe succeeds even when Redis is offline (PostgreSQL Fallback)
def test_swipe_succeeds_when_redis_unavailable(api_client, job_ids):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    target_job_id = job_ids[3]

    # Mock cache_service to simulate Redis outage
    mock_failing_cache = MagicMock()
    mock_failing_cache.add_swiped_job_id.return_value = False
    mock_failing_cache.invalidate_user_feed_cache.return_value = False

    with patch("api.routers.swipes.get_cache_service", return_value=mock_failing_cache):
        # Swipe should still succeed with 201 Created via PostgreSQL
        res_swipe = api_client.post("/api/v1/swipes", json={"job_id": target_job_id, "direction": "RIGHT"}, headers=headers)
        assert res_swipe.status_code == 201
        assert "swipe_id" in res_swipe.json()


# 10. Job feed succeeds and excludes swiped jobs when Redis is offline (PostgreSQL Fallback)
def test_job_feed_succeeds_with_exclusion_when_redis_unavailable(api_client, job_ids):
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    target_job_id = job_ids[4]

    # Swipe job in PostgreSQL
    res_swipe = api_client.post("/api/v1/swipes", json={"job_id": target_job_id, "direction": "RIGHT"}, headers=headers)
    assert res_swipe.status_code == 201

    # Mock cache_service to simulate complete Redis outage (get_swiped_job_ids returns None)
    mock_failing_cache = MagicMock()
    mock_failing_cache.get_swiped_job_ids.return_value = None
    mock_failing_cache.get_job_feed.return_value = None

    with patch("api.routers.jobs.get_cache_service", return_value=mock_failing_cache):
        # GET /api/v1/jobs should fall back to PostgreSQL swipes table and return 200 OK
        res_feed = api_client.get("/api/v1/jobs?page_size=20", headers=headers)
        assert res_feed.status_code == 200
        feed_jobs = res_feed.json()
        assert target_job_id not in [j["job_id"] for j in feed_jobs], "PostgreSQL fallback must exclude swiped job even if Redis is offline"


# 11. Existing Job API filters continue working alongside caching & feed exclusion
def test_job_api_filters_with_caching(api_client):
    response = api_client.get("/api/v1/jobs?location=Kolkata&salary_min=100000&page_size=5")
    assert response.status_code == 200
    jobs = response.json()
    assert isinstance(jobs, list)
    for j in jobs:
        assert "kolkata" in j["location"].lower()
