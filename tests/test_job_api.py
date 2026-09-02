"""
Automated Test Suite for Job Service API Endpoints (GET /api/v1/jobs & GET /api/v1/jobs/{job_id}).
Tests all 17 required API scenarios + salary_range formatting verification using FastAPI TestClient against PostgreSQL database.
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


@pytest.fixture(scope="module")
def api_client(tmp_path_factory):
    """
    Initializes database (PostgreSQL if DATABASE_URL is set, or isolated SQLite for fallback)
    and returns FastAPI TestClient instance.
    """
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    # Ensure database schema is initialized
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


# 1. GET /api/v1/jobs basic listing
def test_get_jobs_basic(api_client):
    response = api_client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 20
    first = data[0]
    assert "job_id" in first
    assert "title" in first
    assert "company" in first
    assert "location" in first
    assert "skills" in first
    assert "posted_at" in first


# 2. Pagination
def test_jobs_pagination(api_client):
    res1 = api_client.get("/api/v1/jobs?page=1&page_size=5")
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1) == 5

    res2 = api_client.get("/api/v1/jobs?page=2&page_size=5")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) == 5

    # Check distinct items between page 1 and page 2
    ids1 = [j["job_id"] for j in data1]
    ids2 = [j["job_id"] for j in data2]
    assert set(ids1).isdisjoint(set(ids2))


# 3. Empty results for non-matching criteria
def test_empty_results(api_client):
    response = api_client.get("/api/v1/jobs?location=NonExistentCityX123")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


# 4. Location filtering (substring match)
def test_location_filtering(api_client):
    response = api_client.get("/api/v1/jobs?location=Kolkata&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    for job in data:
        assert "kolkata" in job["location"].lower()


# 5. Type / Company Type filtering
def test_company_type_filtering(api_client):
    # Currently company_type is NULL in Dataset 1, returns 200 OK with []
    response = api_client.get("/api/v1/jobs?type=MNC")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


# 6. Remote filtering
def test_remote_filtering(api_client):
    # Currently work_mode is NULL in Dataset 1, returns 200 OK with []
    response = api_client.get("/api/v1/jobs?remote=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


# 7. salary_min filtering
def test_salary_min_filtering(api_client):
    response = api_client.get("/api/v1/jobs?salary_min=300000&page_size=100")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0


# 8. salary_max filtering
def test_salary_max_filtering(api_client):
    response = api_client.get("/api/v1/jobs?salary_max=500000&page_size=100")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0


# 9. salary_min + salary_max filtering
def test_salary_range_filtering(api_client):
    response = api_client.get("/api/v1/jobs?salary_min=200000&salary_max=400000&page_size=100")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0


# 10. Undisclosed salaries excluded from salary filtering
def test_undisclosed_salary_excluded(api_client):
    # Fetch job details for all returned items when salary filter applied
    response = api_client.get("/api/v1/jobs?salary_min=100000&page_size=50")
    assert response.status_code == 200
    summary_jobs = response.json()
    for item in summary_jobs:
        detail_res = api_client.get(f"/api/v1/jobs/{item['job_id']}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["min_salary"] is not None or detail["max_salary"] is not None


# 11. Skills OR filtering
def test_skills_or_filtering(api_client):
    response = api_client.get("/api/v1/jobs?skills=Python,SQL&page_size=20")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    for job in data:
        job_skills_lower = [s.lower() for s in job["skills"]]
        assert any(sk in job_skills_lower for sk in ["python", "sql"])


# 12. Multiple filters together
def test_multiple_filters_together(api_client):
    response = api_client.get("/api/v1/jobs?location=Ahmedabad&skills=Safety&salary_min=100000")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# 13. GET /api/v1/jobs/{UUID} valid retrieval
def test_get_job_detail_valid(api_client):
    list_res = api_client.get("/api/v1/jobs?page_size=1")
    assert list_res.status_code == 200
    first_job_id = list_res.json()[0]["job_id"]

    detail_res = api_client.get(f"/api/v1/jobs/{first_job_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["job_id"] == first_job_id
    assert "raw_job_id" in detail
    assert "job_description" in detail
    assert "company" in detail
    assert "currency" in detail
    assert "skills" in detail


# 14. Nonexistent UUID -> 404
def test_get_job_detail_nonexistent_uuid(api_client):
    random_uuid = str(uuid.uuid4())
    response = api_client.get(f"/api/v1/jobs/{random_uuid}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# 15. Invalid UUID format -> 400
def test_get_job_detail_invalid_uuid(api_client):
    response = api_client.get("/api/v1/jobs/invalid-uuid-12345")
    assert response.status_code == 400
    assert "invalid job_id format" in response.json()["detail"].lower()


# 16. Invalid pagination parameters -> 400
def test_invalid_pagination(api_client):
    res_page_zero = api_client.get("/api/v1/jobs?page=0")
    assert res_page_zero.status_code == 422 or res_page_zero.status_code == 400

    res_size_large = api_client.get("/api/v1/jobs?page_size=150")
    assert res_size_large.status_code == 422 or res_size_large.status_code == 400


# 17. Invalid salary range -> 400
def test_invalid_salary_range(api_client):
    response = api_client.get("/api/v1/jobs?salary_min=1000000&salary_max=500000")
    assert response.status_code == 400
    assert "salary_min cannot be greater than salary_max" in response.json()["detail"]


# 18. Known salary -> correct salary_range formatting
def test_salary_range_known_salary(api_client):
    response = api_client.get("/api/v1/jobs?salary_min=200000&salary_max=400000&page_size=10")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) > 0
    for job in jobs:
        assert job["salary_range"] is not None
        assert "Yrs" not in job["salary_range"]
        assert "years" not in job["salary_range"].lower()


# 19. Undisclosed salary -> salary_range does not contain experience
def test_salary_range_undisclosed_salary(api_client):
    # Fetch first page of jobs (which includes undisclosed salary jobs)
    response = api_client.get("/api/v1/jobs?page_size=100")
    assert response.status_code == 200
    jobs = response.json()
    undisclosed_found = False

    for job in jobs:
        detail_res = api_client.get(f"/api/v1/jobs/{job['job_id']}")
        assert detail_res.status_code == 200
        detail = detail_res.json()

        if detail["min_salary"] is None and detail["max_salary"] is None:
            undisclosed_found = True
            # Check summary salary_range and detail salary_range
            assert job["salary_range"] == "Not disclosed"
            assert detail["salary_range"] == "Not disclosed"
            assert "Yrs" not in job["salary_range"]

    assert undisclosed_found, "Should have verified at least one undisclosed salary job"


# 20. experience_str remains independent from salary_range
def test_experience_str_independence(api_client):
    response = api_client.get("/api/v1/jobs?page_size=50")
    assert response.status_code == 200
    jobs = response.json()

    for job in jobs:
        detail_res = api_client.get(f"/api/v1/jobs/{job['job_id']}")
        assert detail_res.status_code == 200
        detail = detail_res.json()

        # If undisclosed salary, salary_range must be 'Not disclosed' while experience_str retains experience
        if detail["min_salary"] is None and detail["max_salary"] is None:
            assert detail["salary_range"] == "Not disclosed"
            if detail["experience_str"] is not None:
                assert "Yrs" in detail["experience_str"] or "yrs" in detail["experience_str"].lower()


# 21. Attempting GET /api/v1/jobs/{integer raw_job_id} must return 400 (raw_job_id is non-unique and not internal UUID)
def test_raw_job_id_lookup_rejected(api_client):
    # Attempting to fetch job detail using integer dataset raw_job_id
    response = api_client.get("/api/v1/jobs/1346914")
    assert response.status_code == 400
    assert "invalid job_id format" in response.json()["detail"].lower()


# 22. Skills search with whitespace padding is normalized correctly & case-insensitive
def test_skills_whitespace_trimming(api_client):
    response = api_client.get("/api/v1/jobs?skills=%20Python%20,%20SQL%20&page_size=10")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) > 0
    for job in jobs:
        job_skills_lower = [s.lower() for s in job["skills"]]
        assert any(sk in job_skills_lower for sk in ["python", "sql"])


# 23. Maximum page_size boundary verification (100 succeeds, 101 rejected)
def test_max_page_size_boundary(api_client):
    # page_size=100 must succeed
    res_100 = api_client.get("/api/v1/jobs?page_size=100")
    assert res_100.status_code == 200
    assert len(res_100.json()) <= 100

    # page_size=101 must be rejected
    res_101 = api_client.get("/api/v1/jobs?page_size=101")
    assert res_101.status_code in (400, 422)

