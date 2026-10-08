"""
Automated End-to-End Regression & Quality Assurance Test Suite for Milestone 2 — Day 6.
Tests meaningful user session workflows, payload contract completeness, deep pagination bounds,
foreign key deletion constraints, and case-insensitive skill matching.
All temporary test records use valid UUIDs and are cleaned up upon test completion.
"""
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVICE_DIR = os.path.join(BASE_DIR, "data_hanith")
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from datetime import datetime, timezone
from config import RAW_DATASET1_PATH, DATABASE_URL
from scripts.ingest_dataset1 import run_ingestion
from main import app
from db.connection import get_raw_connection, init_db
from api.dependencies import create_test_jwt


@pytest.fixture(scope="module")
def api_client():
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    schema_sql_path = os.path.join(SERVICE_DIR, "db", "schema.sql")
    init_db(db_url, schema_sql_path)

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


def auth_header(user_id: str, role: str = "Job Seeker") -> dict:
    jwt_token = create_test_jwt(user_id, role)
    return {"Authorization": f"Bearer {jwt_token}"}


# =============================================================================
# 1. END-TO-END MULTI-STEP USER SESSION WORKFLOW REGRESSION
# =============================================================================

def test_end_to_end_job_seeker_workflow(api_client):
    """
    Validates a complete multi-step Job Seeker user journey:
    1. Browse paginated job feed (GET /api/v1/jobs)
    2. View detail for target job (GET /api/v1/jobs/{job_id})
    3. View detail for job's company (GET /api/v1/companies/{company_id})
    4. Swipe RIGHT on job (POST /api/v1/swipes)
    5. Verify swiped job is excluded from next feed request
    6. Verify swipe record in history (GET /api/v1/swipes/history)
    7. Clean up test swipe
    """
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")

    # Step 1: Browse Job Feed
    feed_res = api_client.get("/api/v1/jobs?page=1&page_size=5", headers=headers)
    assert feed_res.status_code == 200
    feed_jobs = feed_res.json()
    assert len(feed_jobs) > 0
    target_job_id = feed_jobs[0]["job_id"]

    # Step 2: Get Job Detail
    detail_res = api_client.get(f"/api/v1/jobs/{target_job_id}")
    assert detail_res.status_code == 200
    job_detail = detail_res.json()
    assert job_detail["job_id"] == target_job_id
    company_obj = job_detail["company"]
    assert company_obj is not None
    target_company_id = company_obj["company_id"]

    # Step 3: Get Company Detail
    company_res = api_client.get(f"/api/v1/companies/{target_company_id}")
    assert company_res.status_code == 200
    company_detail = company_res.json()
    assert company_detail["company_id"] == target_company_id
    assert "job_count" in company_detail

    # Step 4: Swipe RIGHT on Job
    swipe_res = api_client.post("/api/v1/swipes", json={"job_id": target_job_id, "direction": "RIGHT"}, headers=headers)
    assert swipe_res.status_code == 201
    assert "swipe_id" in swipe_res.json()

    # Step 5: Verify Feed Exclusion
    feed_after_res = api_client.get("/api/v1/jobs?page=1&page_size=5", headers=headers)
    assert feed_after_res.status_code == 200
    feed_after_ids = [j["job_id"] for j in feed_after_res.json()]
    assert target_job_id not in feed_after_ids, "Swiped job must be excluded from user feed"

    # Step 6: Inspect Swipe History
    history_res = api_client.get("/api/v1/swipes/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 1
    assert history[0]["job_id"] == target_job_id
    assert history[0]["direction"] == "RIGHT"

    # Step 7: Targeted Cleanup of Test Swipe
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()
    placeholder = "%s" if db_type == "postgres" else "?"
    cur.execute(f"DELETE FROM swipes WHERE user_id = {placeholder} AND job_id = {placeholder};", (user_id, target_job_id))
    conn.commit()
    cur.close()
    conn.close()


# =============================================================================
# 2. DEEP PAGINATION BOUNDS & DISJOINT SET ISOLATION
# =============================================================================

def test_deep_pagination_bounds_and_isolation(api_client):
    """
    Verifies pagination boundaries and disjoint set isolation between different page numbers.
    """
    # Page 1 vs Page 2
    res_p1 = api_client.get("/api/v1/jobs?page=1&page_size=10")
    res_p2 = api_client.get("/api/v1/jobs?page=2&page_size=10")
    assert res_p1.status_code == 200
    assert res_p2.status_code == 200

    p1_ids = [j["job_id"] for j in res_p1.json()]
    p2_ids = [j["job_id"] for j in res_p2.json()]
    assert len(p1_ids) == 10
    assert len(p2_ids) == 10
    assert set(p1_ids).isdisjoint(set(p2_ids)), "Pages 1 and 2 must return completely disjoint job sets"

    # High page out-of-bounds returns empty list 200 OK
    res_p9999 = api_client.get("/api/v1/jobs?page=99999&page_size=10")
    assert res_p9999.status_code == 200
    assert res_p9999.json() == []


# =============================================================================
# 3. RESPONSE PAYLOAD CONTRACT COMPLETENESS REGRESSION
# =============================================================================

def test_response_payload_contract_completeness(api_client):
    """
    Validates that returned JSON payloads match exact Pydantic schema contracts
    including Day 4 freshness/competition indicators and M2 company profile fields.
    """
    # Summary Schema Keys
    res_list = api_client.get("/api/v1/jobs?page_size=1")
    assert res_list.status_code == 200
    job_summary = res_list.json()[0]

    summary_keys = {"job_id", "title", "company", "type", "location", "salary_range", "skills", "posted_at", "freshness_level", "applicant_count", "competition_level"}
    assert summary_keys.issubset(set(job_summary.keys())), f"Missing keys in JobSummarySchema: {summary_keys - set(job_summary.keys())}"

    # Detail Schema Keys
    res_detail = api_client.get(f"/api/v1/jobs/{job_summary['job_id']}")
    assert res_detail.status_code == 200
    job_detail = res_detail.json()

    detail_keys = {"job_id", "raw_job_id", "title", "job_description", "company", "min_salary", "max_salary", "currency", "salary_range", "min_experience", "max_experience", "experience_str", "location", "work_mode", "job_type", "posted_at_raw", "posted_at_approx", "skills", "freshness_level", "applicant_count", "competition_level"}
    assert detail_keys.issubset(set(job_detail.keys())), f"Missing keys in JobDetailSchema: {detail_keys - set(job_detail.keys())}"

    # Company Detail Schema Keys
    if job_detail["company"]:
        c_detail_res = api_client.get(f"/api/v1/companies/{job_detail['company']['company_id']}")
        assert c_detail_res.status_code == 200
        comp_detail = c_detail_res.json()
        comp_keys = {"company_id", "raw_company_id", "name", "company_type", "aggregate_rating", "reviews_count", "about", "size", "industry", "is_newly_founded", "job_count", "jobs"}
        assert comp_keys.issubset(set(comp_detail.keys())), f"Missing keys in CompanyDetailSchema: {comp_keys - set(comp_detail.keys())}"


# =============================================================================
# 4. RELATIONAL INTEGRITY & ISOLATED CLEANUP
# =============================================================================

def test_relational_cascade_and_targeted_cleanup(api_client):
    """
    Inserts a temporary test record with valid UUID, verifies relational queries,
    and performs targeted cleanup without affecting any other database rows.
    """
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()
    placeholder = "%s" if db_type == "postgres" else "?"

    # 1. Fetch valid company and skill
    cur.execute("SELECT id FROM companies LIMIT 1;")
    c_id = cur.fetchone()[0]

    cur.execute("SELECT id FROM skills LIMIT 1;")
    sk_id = cur.fetchone()[0]

    # 2. Insert test job
    test_job_uuid = str(uuid.uuid4())
    raw_id = 88888888
    now_iso = datetime.now(timezone.utc).isoformat()
    cur.execute(f"""
        INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, currency, location, posted_at_raw, created_at, updated_at)
        VALUES ({placeholder}, {placeholder}, {placeholder}, 'D6 QA Job', 'Description', 'INR', 'Test Location', 'Today', {placeholder}, {placeholder});
    """, (test_job_uuid, raw_id, c_id, now_iso, now_iso))

    # 3. Insert test job_skill link
    cur.execute(f"INSERT INTO job_skills (job_id, skill_id) VALUES ({placeholder}, {placeholder});", (test_job_uuid, sk_id))
    conn.commit()

    # 4. Verify API can retrieve detail for test_job_uuid
    res = api_client.get(f"/api/v1/jobs/{test_job_uuid}")
    assert res.status_code == 200
    assert res.json()["title"] == "D6 QA Job"

    # 5. Targeted Cleanup of ONLY test_job_uuid
    cur.execute(f"DELETE FROM jobs WHERE id = {placeholder};", (test_job_uuid,))
    conn.commit()

    # Verify CASCADE cleaned up job_skills link
    cur.execute(f"SELECT COUNT(*) FROM job_skills WHERE job_id = {placeholder};", (test_job_uuid,))
    assert cur.fetchone()[0] == 0

    cur.close()
    conn.close()


# =============================================================================
# 5. SKILLS CASE-INSENSITIVITY & OR SEMANTICS DEEP REGRESSION
# =============================================================================

def test_skills_case_insensitivity_and_or_semantics(api_client):
    """
    Verifies that comma-separated skills filtering ignores letter casing, trims whitespace,
    and returns jobs matching ANY of the requested skills.
    """
    res_mixed = api_client.get("/api/v1/jobs?skills=%20pYtHoN%20,%20SqL%20&page_size=10")
    assert res_mixed.status_code == 200
    jobs = res_mixed.json()
    assert len(jobs) > 0

    for job in jobs:
        sk_lower = [s.lower() for s in job["skills"]]
        assert any(s in sk_lower for s in ["python", "sql"]), "Returned job must contain at least one of requested skills"
