"""
Automated Integration & Concurrency Test Suite for Milestone 2 Day 5.
Validates concurrent swipe prevention under race conditions, PostgreSQL unique constraint enforcement,
foreign key deletion integrity (RESTRICT & CASCADE), and swipe-to-feed exclusion logic.
"""
import os
import sys
import uuid
import pytest
import concurrent.futures
from fastapi.testclient import TestClient

# Add data_hanith to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVICE_DIR = os.path.join(BASE_DIR, "data_hanith")
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

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


@pytest.fixture(scope="module")
def sample_job_id(api_client):
    res = api_client.get("/api/v1/jobs?page_size=1")
    assert res.status_code == 200
    jobs = res.json()
    assert len(jobs) > 0
    return jobs[0]["job_id"]


def auth_header(user_id: str, role: str = "Job Seeker") -> dict:
    jwt_token = create_test_jwt(user_id, role)
    return {"Authorization": f"Bearer {jwt_token}"}


# =============================================================================
# CONCURRENCY TESTS (10-THREAD CONCURRENT SWIPE ATTEMPT)
# =============================================================================

def test_concurrent_swipe_uniqueness_authoritative(api_client, sample_job_id):
    """
    Spawns 10 parallel threads attempting POST /api/v1/swipes for the exact same (user_id, job_id).
    Authoritative Guardrail Check: PostgreSQL COUNT(*) for (user_id, job_id) in swipes table MUST be EXACTLY 1.
    """
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")
    payload = {"job_id": sample_job_id, "direction": "RIGHT"}

    def perform_swipe():
        # Create an independent TestClient call per thread
        return api_client.post("/api/v1/swipes", json=payload, headers=headers)

    # Launch 10 concurrent threads
    num_threads = 10
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(perform_swipe) for _ in range(num_threads)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    status_codes = [r.status_code for r in results]
    success_count = status_codes.count(201)
    conflict_count = status_codes.count(409)

    # HTTP Response Distribution Assertion
    assert success_count == 1, f"Expected exactly 1 successful 201 response, got {success_count}"
    assert conflict_count == num_threads - 1, f"Expected {num_threads - 1} 409 Conflict responses, got {conflict_count}"

    # AUTHORITATIVE GUARDRAIL INTEGRITY CHECK DIRECTLY IN POSTGRESQL
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()
    placeholder = "%s" if db_type == "postgres" else "?"

    cur.execute(f"SELECT COUNT(*) FROM swipes WHERE user_id = {placeholder} AND job_id = {placeholder};", (user_id, sample_job_id))
    db_row_count = cur.fetchone()[0]

    # Cleanup test swipe
    cur.execute(f"DELETE FROM swipes WHERE user_id = {placeholder} AND job_id = {placeholder};", (user_id, sample_job_id))
    conn.commit()
    cur.close()
    conn.close()

    # Authoritative Assertion: Exactly 1 row was stored in PostgreSQL
    assert db_row_count == 1, f"Authoritative Check Failed! Expected 1 row in swipes table, found {db_row_count}"


# =============================================================================
# RELATIONAL & FOREIGN KEY INTEGRATION TESTS
# =============================================================================

def test_company_deletion_restricted_fk(api_client, sample_job_id):
    """
    Verifies ON DELETE RESTRICT foreign key constraint.
    Attempting to delete a company that has linked jobs must be rejected by PostgreSQL.
    """
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()

    # Get company_id linked to sample_job_id
    placeholder = "%s" if db_type == "postgres" else "?"
    cur.execute(f"SELECT company_id FROM jobs WHERE id = {placeholder};", (sample_job_id,))
    comp_id = cur.fetchone()[0]

    # Attempting to delete linked company must raise an IntegrityError / ForeignKeyViolation
    raised_fk_error = False
    try:
        cur.execute(f"DELETE FROM companies WHERE id = {placeholder};", (comp_id,))
        conn.commit()
    except Exception as exc:
        conn.rollback()
        raised_fk_error = True
        err_msg = str(exc).lower()
        assert "foreign key" in err_msg or "violates" in err_msg or "constraint" in err_msg

    cur.close()
    conn.close()
    assert raised_fk_error, "Deleting a company with linked jobs must be blocked by ON DELETE RESTRICT FK constraint"


def test_job_deletion_cascade_fk():
    """
    Verifies ON DELETE CASCADE foreign key behavior.
    Deleting a job record automatically cascades and cleans up associated entries in job_skills and swipes.
    """
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()
    placeholder = "%s" if db_type == "postgres" else "?"

    # 1. Fetch a company and a skill ID
    cur.execute("SELECT id FROM companies LIMIT 1;")
    c_id = cur.fetchone()[0]

    cur.execute("SELECT id FROM skills LIMIT 1;")
    sk_id = cur.fetchone()[0]

    # 2. Insert temporary test job
    test_job_id = str(uuid.uuid4())
    raw_job_id = 99999999
    title = "Test Cascade Job"
    desc = "Cascade testing description"
    posted_at = "Just Now"

    cur.execute(f"""
        INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, currency, location, posted_at_raw)
        VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 'INR', 'Test City', {placeholder});
    """, (test_job_id, raw_job_id, c_id, title, desc, posted_at))

    # 3. Insert temporary job_skills link
    cur.execute(f"INSERT INTO job_skills (job_id, skill_id) VALUES ({placeholder}, {placeholder});", (test_job_id, sk_id))

    # 4. Insert temporary swipe on test_job_id
    test_user_id = str(uuid.uuid4())
    test_swipe_id = str(uuid.uuid4())
    cur.execute(f"""
        INSERT INTO swipes (id, user_id, job_id, direction)
        VALUES ({placeholder}, {placeholder}, {placeholder}, 'RIGHT');
    """, (test_swipe_id, test_user_id, test_job_id))
    conn.commit()

    # 5. Delete test job
    cur.execute(f"DELETE FROM jobs WHERE id = {placeholder};", (test_job_id,))
    conn.commit()

    # 6. Verify job_skills and swipes entries were automatically cascaded
    cur.execute(f"SELECT COUNT(*) FROM job_skills WHERE job_id = {placeholder};", (test_job_id,))
    sk_count = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(*) FROM swipes WHERE job_id = {placeholder};", (test_job_id,))
    sw_count = cur.fetchone()[0]

    cur.close()
    conn.close()

    assert sk_count == 0, "Deleting job must cascade and delete job_skills entries"
    assert sw_count == 0, "Deleting job must cascade and delete swipes entries"


def test_swipe_feed_exclusion_integration(api_client, sample_job_id):
    """
    Verifies cross-component feed exclusion integration:
    Once a user swipes on sample_job_id, subsequent GET /api/v1/jobs feed requests for that user exclude sample_job_id.
    """
    user_id = str(uuid.uuid4())
    headers = auth_header(user_id, "Job Seeker")

    # Fetch initial feed for user
    res_before = api_client.get("/api/v1/jobs?page_size=50", headers=headers)
    assert res_before.status_code == 200
    feed_before = [j["job_id"] for j in res_before.json()]

    # If sample_job_id is in feed, swipe it RIGHT
    if sample_job_id in feed_before:
        res_swipe = api_client.post("/api/v1/swipes", json={"job_id": sample_job_id, "direction": "RIGHT"}, headers=headers)
        assert res_swipe.status_code == 201

        # Fetch feed after swipe
        res_after = api_client.get("/api/v1/jobs?page_size=50", headers=headers)
        assert res_after.status_code == 200
        feed_after = [j["job_id"] for j in res_after.json()]

        # sample_job_id MUST NOT appear in feed_after
        assert sample_job_id not in feed_after, "Swiped job must be automatically excluded from user feed"

        # Cleanup test swipe
        db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
        conn, db_type = get_raw_connection(db_url)
        cur = conn.cursor()
        placeholder = "%s" if db_type == "postgres" else "?"
        cur.execute(f"DELETE FROM swipes WHERE user_id = {placeholder} AND job_id = {placeholder};", (user_id, sample_job_id))
        conn.commit()
        cur.close()
        conn.close()
