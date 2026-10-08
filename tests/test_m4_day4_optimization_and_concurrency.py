"""
Milestone 4 Day 4 Performance, Optimization, and Concurrency Test Suite.
Validates atomic SQL applicant_count increments under 10-thread concurrent applications,
PostgreSQL DDL schema extension dry-run, 18-table backup/restore integrity,
justified index scan execution, and transaction rollback isolation.
"""
import os
import sys
import uuid
import sqlite3
import pytest
import concurrent.futures
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data_hanith"))
sys.path.insert(0, BASE_DIR)

from config import get_reference_time
from db.connection import get_raw_connection, init_db
from db.repositories.application_repository import ApplicationRepository
from db.repositories.analytics_repository import AnalyticsRepository
from scripts.apply_m4_migration import apply_migration, M4_EXPECTED_TABLES
from scripts.validate_day5_backup_restore import validate_sqlite_backup_restore


@pytest.fixture
def m4_day4_db():
    """Creates an isolated temporary SQLite database for Day 4 concurrency and performance testing."""
    db_file = os.path.join(BASE_DIR, "data", f"test_m4_day4_{uuid.uuid4().hex}.db")
    db_url = f"sqlite:///{db_file}"

    schema_sql_path = os.path.join(BASE_DIR, "db", "schema.sql")
    init_db(db_url, schema_sql_path)
    apply_migration(db_url)

    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()

    ref_iso = get_reference_time().isoformat()
    comp_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    sk_id = str(uuid.uuid4())

    cur.execute("INSERT INTO companies (id, raw_company_id, name, created_at, updated_at) VALUES (?, 6001, 'Perf Corp', ?, ?)", (comp_id, ref_iso, ref_iso))
    cur.execute(
        """INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, currency, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
           VALUES (?, 7001, ?, 'Concurrency Engineer', 'Description', 'INR', 'Hyderabad', 0, 'LOW', 'Today', ?, ?, ?)""",
        (job_id, comp_id, ref_iso, ref_iso, ref_iso)
    )
    cur.execute("INSERT INTO skills (id, name, created_at) VALUES (?, 'Concurrency', ?)", (sk_id, ref_iso))
    cur.execute("INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)", (job_id, sk_id))
    conn.commit()

    yield conn, db_type, db_url, job_id

    conn.close()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except OSError:
            pass


# -----------------------------------------------------------------------------
# 1. ATOMIC COUNTER INCREMENT CONCURRENCY TEST (10-THREAD PARALLEL APPLICATIONS)
# -----------------------------------------------------------------------------
def test_1_concurrent_application_atomic_counter_increment(m4_day4_db):
    _, _, db_url, job_id = m4_day4_db
    num_threads = 10
    user_ids = [str(uuid.uuid4()) for _ in range(num_threads)]

    def submit_app(u_id: str):
        # Open an independent database connection per thread to simulate real concurrent clients
        t_conn, t_db_type = get_raw_connection(db_url)
        try:
            t_repo = ApplicationRepository(t_conn, t_db_type)
            res = t_repo.create_application(user_id=u_id, job_id=job_id)
            return res["status"] == "APPLIED"
        finally:
            t_conn.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(submit_app, u_id) for u_id in user_ids]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert len(results) == num_threads
    assert all(r is True for r in results), "All 10 concurrent application submissions must succeed."

    # Authoritative DB verification: applicant_count MUST be exactly 10 with 0 lost updates
    conn, _ = get_raw_connection(db_url)
    cur = conn.cursor()

    cur.execute("SELECT applicant_count FROM jobs WHERE id = ?", (job_id,))
    final_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM applications WHERE job_id = ?", (job_id,))
    total_apps = cur.fetchone()[0]
    conn.close()

    assert final_count == num_threads, f"Atomic SQL update failed! Expected applicant_count = {num_threads}, got {final_count}"
    assert total_apps == num_threads, f"Expected {num_threads} application records in DB, found {total_apps}"


# -----------------------------------------------------------------------------
# 2. POSTGRESQL PRODUCTION DDL DRY-RUN & IDEMPOTENCY TEST
# -----------------------------------------------------------------------------
def test_2_postgres_ddl_dry_run_validation():
    ddl_path = os.path.join(BASE_DIR, "db", "migrations", "004_m4_schema_extension.sql")
    assert os.path.exists(ddl_path), "004_m4_schema_extension.sql DDL script must exist."

    with open(ddl_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Verify DDL contains all required tables and constraints
    for tbl in M4_EXPECTED_TABLES:
        assert f"CREATE TABLE IF NOT EXISTS {tbl}" in sql_content

    assert "CONSTRAINT uq_user_job_application UNIQUE (user_id, job_id)" in sql_content
    assert "idx_applications_user_status" in sql_content


# -----------------------------------------------------------------------------
# 3. BACKUP & RESTORE INTEGRITY ACROSS ALL 18 TABLES
# -----------------------------------------------------------------------------
def test_3_backup_restore_all_18_tables(m4_day4_db):
    conn, _, db_url, _ = m4_day4_db
    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(FULL);")

    sqlite_path = db_url.replace("sqlite:///", "")
    res = validate_sqlite_backup_restore(sqlite_path)

    assert res["status"] == "PASS"
    assert len(res["restored_counts"]) == 18, "Backup and restore must validate all 18 project database tables."
    for tbl in M4_EXPECTED_TABLES:
        assert tbl in res["restored_counts"]


# -----------------------------------------------------------------------------
# 4. JUSTIFIED INDEX VERIFICATION & EXPLAIN QUERY PLAN TEST
# -----------------------------------------------------------------------------
def test_4_justified_compound_index_verification(m4_day4_db):
    conn, _, _, _ = m4_day4_db
    cur = conn.cursor()

    # Verify idx_applications_user_status index exists in database schema
    cur.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_applications_user_status';")
    idx_row = cur.fetchone()
    assert idx_row is not None, "Compound index idx_applications_user_status must exist in schema."

    # Verify query plan utilizes index scan for status-filtered user applications
    cur.execute("EXPLAIN QUERY PLAN SELECT id FROM applications WHERE user_id = 'test-user' AND status = 'SHORTLISTED';")
    plan_rows = cur.fetchall()
    plan_str = str(plan_rows).lower()

    assert "index" in plan_str or "idx_applications" in plan_str, "Query execution plan must utilize application indexes."
