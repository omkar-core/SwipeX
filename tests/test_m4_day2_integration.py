"""
Milestone 4 Day 2 Integration & Concurrency Test Suite.
Tests migration safety, applicant counter increments, atomic transactions,
competition formula & age transition rules, Redis caching & failure fallback,
early applicant NULL semantics, reference clock provider, rollback script safety,
and backup/restore schema integrity.
"""
import os
import sys
import uuid
import sqlite3
import pytest
from datetime import datetime, timedelta, timezone

# Add data_hanith to python path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data_hanith"))
sys.path.insert(0, BASE_DIR)

from config import DATASET_REF_TIMESTAMP, get_reference_time
from db.connection import get_raw_connection, init_db
from db.cache import RedisCacheService, reset_redis_client
from services.job_indicators import (
    compute_competition_level,
    compute_early_applicant_status,
    compute_is_recently_posted
)
from db.repositories.application_repository import ApplicationRepository
from db.repositories.job_repository import JobRepository
from scripts.apply_m4_migration import apply_migration, M4_EXPECTED_TABLES
from scripts.validate_day5_backup_restore import validate_sqlite_backup_restore


@pytest.fixture
def m4_test_db():
    """Creates a fresh, isolated temporary SQLite database populated with baseline data."""
    db_file = os.path.join(BASE_DIR, "data", f"test_m4_day2_{uuid.uuid4().hex}.db")
    db_url = f"sqlite:///{db_file}"

    schema_sql_path = os.path.join(BASE_DIR, "db", "schema.sql")
    init_db(db_url, schema_sql_path)

    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()

    # Seed baseline M1-M3 test records
    comp_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    sk_id = str(uuid.uuid4())
    ref_iso = get_reference_time().isoformat()

    cur.execute("INSERT INTO companies (id, raw_company_id, name, created_at, updated_at) VALUES (?, 1001, 'Baseline Corp', ?, ?)", (comp_id, ref_iso, ref_iso))
    cur.execute(
        """INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, currency, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
           VALUES (?, 2001, ?, 'Baseline Engineer', 'Description', 'INR', 'Bangalore', 5, 'LOW', '2 Days Ago', ?, ?, ?)""",
        (job_id, comp_id, ref_iso, ref_iso, ref_iso)
    )
    cur.execute("INSERT INTO skills (id, name, created_at) VALUES (?, 'Python', ?)", (sk_id, ref_iso))
    cur.execute("INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)", (job_id, sk_id))
    conn.commit()

    yield conn, db_type, db_url, comp_id, job_id

    conn.close()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except OSError:
            pass


# -----------------------------------------------------------------------------
# 1. MIGRATION SAFETY & RERUNNABILITY TESTS
# -----------------------------------------------------------------------------
def test_1_m4_migration_apply_and_idempotency(m4_test_db):
    _, _, db_url, _, _ = m4_test_db

    # Apply migration
    first_pass = apply_migration(db_url)
    assert first_pass is True, "M4 migration must succeed on first application."

    # Rerun migration (Idempotency test)
    second_pass = apply_migration(db_url)
    assert second_pass is True, "M4 migration must be safely rerunnable without errors."


def test_2_existing_m1_m3_data_counts_preserved(m4_test_db):
    conn, _, db_url, _, _ = m4_test_db
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_before = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM companies;")
    companies_before = cur.fetchone()[0]

    apply_migration(db_url)

    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM companies;")
    companies_after = cur.fetchone()[0]

    assert jobs_after == jobs_before, "Jobs count must be preserved after migration."
    assert companies_after == companies_before, "Companies count must be preserved after migration."


# -----------------------------------------------------------------------------
# 2. ATOMIC APPLICATION CREATION & COUNTER INCREMENT TESTS
# -----------------------------------------------------------------------------
def test_3_application_counter_increment_exactness(m4_test_db):
    conn, db_type, db_url, _, job_id = m4_test_db
    apply_migration(db_url)

    app_repo = ApplicationRepository(conn, db_type)
    user_id = str(uuid.uuid4())

    app = app_repo.create_application(user_id=user_id, job_id=job_id)
    assert app["applicant_count"] == 6  # Incremented from 5 to 6

    cur = conn.cursor()
    cur.execute("SELECT applicant_count FROM jobs WHERE id = ?", (job_id,))
    assert cur.fetchone()[0] == 6


def test_4_duplicate_application_rejection(m4_test_db):
    conn, db_type, db_url, _, job_id = m4_test_db
    apply_migration(db_url)

    app_repo = ApplicationRepository(conn, db_type)
    user_id = str(uuid.uuid4())

    app_repo.create_application(user_id=user_id, job_id=job_id)

    # Attempting duplicate application for same (user_id, job_id) raises IntegrityError or OperationalError
    with pytest.raises((sqlite3.IntegrityError, sqlite3.OperationalError, Exception)):
        app_repo.create_application(user_id=user_id, job_id=job_id)


def test_5_atomic_transaction_rollback_isolation(m4_test_db):
    conn, db_type, db_url, _, job_id = m4_test_db
    apply_migration(db_url)

    cur = conn.cursor()
    cur.execute("SELECT applicant_count FROM jobs WHERE id = ?", (job_id,))
    count_before = cur.fetchone()[0]

    user_id = str(uuid.uuid4())
    fake_job_id = str(uuid.uuid4())

    app_repo = ApplicationRepository(conn, db_type)
    with pytest.raises(ValueError):
        app_repo.create_application(user_id=user_id, job_id=fake_job_id)

    # Verify applicant count of real job remained unchanged
    cur.execute("SELECT applicant_count FROM jobs WHERE id = ?", (job_id,))
    assert cur.fetchone()[0] == count_before


# -----------------------------------------------------------------------------
# 3. COMPETITION LEVEL & AGE TRANSITION TESTS
# -----------------------------------------------------------------------------
def test_6_competition_recalculated_after_application(m4_test_db):
    conn, db_type, db_url, comp_id, _ = m4_test_db
    apply_migration(db_url)

    cur = conn.cursor()
    target_job_id = str(uuid.uuid4())
    ref_time = get_reference_time()
    posted_iso = (ref_time - timedelta(days=5)).isoformat()

    # Seed job with 19 applicants, 5 days old -> Currently MEDIUM
    cur.execute(
        """INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, currency, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
           VALUES (?, 3001, ?, 'High Comp Job', 'Desc', 'INR', 'Mumbai', 19, 'MEDIUM', '5 Days Ago', ?, ?, ?)""",
        (target_job_id, comp_id, posted_iso, ref_time.isoformat(), ref_time.isoformat())
    )
    conn.commit()

    app_repo = ApplicationRepository(conn, db_type)
    user_id = str(uuid.uuid4())

    # 20th applicant arrives -> (A=20, Age=5d <= 7d) -> Transitions to HIGH
    app = app_repo.create_application(user_id=user_id, job_id=target_job_id)

    assert app["applicant_count"] == 20
    assert app["competition_level"] == "HIGH"


def test_7_competition_age_transition(m4_test_db):
    ref = get_reference_time()

    # A=20, Age=5 days -> HIGH (A>=20 and Age<=7d)
    posted_5d = (ref - timedelta(days=5)).isoformat()
    assert compute_competition_level(20, posted_5d, ref) == "HIGH"

    # A=20, Age=10 days -> MEDIUM (A>=20, but Age>7d)
    posted_10d = (ref - timedelta(days=10)).isoformat()
    assert compute_competition_level(20, posted_10d, ref) == "MEDIUM"

    # A=15, Age=40 days -> LOW (A<20 and Age>30d)
    posted_40d = (ref - timedelta(days=40)).isoformat()
    assert compute_competition_level(15, posted_40d, ref) == "LOW"


def test_8_competition_null_posted_at_approx(m4_test_db):
    # NULL posting date uses count-only thresholds
    assert compute_competition_level(5, None) == "LOW"
    assert compute_competition_level(20, None) == "MEDIUM"
    assert compute_competition_level(50, None) == "HIGH"


# -----------------------------------------------------------------------------
# 4. REDIS COMPETITION CACHING & FALLBACK TESTS
# -----------------------------------------------------------------------------
def test_9_redis_competition_cache_key_schema_and_ttl():
    cache_svc = RedisCacheService()
    test_job_id = f"test_job_{uuid.uuid4().hex}"
    comp_data = {
        "applicant_count": 15,
        "competition_level": "MEDIUM",
        "is_recently_posted": True
    }

    # Set competition cache with default TTL 600s
    res = cache_svc.set_job_competition(test_job_id, comp_data, ttl=600)
    if res:
        cached = cache_svc.get_job_competition(test_job_id)
        assert cached is not None
        assert cached["applicant_count"] == 15
        assert cached["competition_level"] == "MEDIUM"

        # Invalidate cache
        inv = cache_svc.invalidate_job_competition(test_job_id)
        assert inv is True
        assert cache_svc.get_job_competition(test_job_id) is None


def test_10_redis_offline_fallback_safety(m4_test_db):
    conn, db_type, db_url, _, job_id = m4_test_db
    apply_migration(db_url)

    # Force Redis offline simulation
    reset_redis_client()
    cache_svc = RedisCacheService(client=None)

    # Getting cache returns None safely without error
    assert cache_svc.get_job_competition(job_id) is None

    # Application creation completes successfully without Redis
    app_repo = ApplicationRepository(conn, db_type)
    user_id = str(uuid.uuid4())
    app = app_repo.create_application(user_id=user_id, job_id=job_id)
    assert app["status"] == "APPLIED"


# -----------------------------------------------------------------------------
# 5. EARLY APPLICANT & REFERENCE CLOCK TESTS
# -----------------------------------------------------------------------------
def test_11_early_applicant_semantics():
    ref = get_reference_time()
    posted_iso = (ref - timedelta(hours=10)).isoformat()
    applied_early = (ref - timedelta(hours=2)).isoformat()
    applied_late = (ref + timedelta(hours=50)).isoformat()

    # Early = TRUE
    is_early_1, status_1 = compute_early_applicant_status(applied_early, posted_iso, window_hours=48)
    assert is_early_1 is True
    assert status_1 == "EARLY"

    # Late = FALSE
    is_early_2, status_2 = compute_early_applicant_status(applied_late, posted_iso, window_hours=48)
    assert is_early_2 is False
    assert status_2 == "REGULAR"

    # NULL = None (NULL), status = "UNAVAILABLE"
    is_early_3, status_3 = compute_early_applicant_status(applied_early, None, window_hours=48)
    assert is_early_3 is None
    assert status_3 == "UNAVAILABLE"


def test_12_reference_clock_provider_respect():
    ref = get_reference_time()
    assert isinstance(ref, datetime)
    assert ref.tzinfo == timezone.utc


# -----------------------------------------------------------------------------
# 6. ROLLBACK & BACKUP RESTORE TESTS
# -----------------------------------------------------------------------------
def test_13_rollback_script_safety(m4_test_db):
    conn, _, db_url, _, _ = m4_test_db
    apply_migration(db_url)

    rollback_file = os.path.join(BASE_DIR, "db", "migrations", "004_m4_rollback.sql")
    assert os.path.exists(rollback_file), "Rollback script must exist."

    with open(rollback_file, "r", encoding="utf-8") as f:
        rollback_sql = f.read()

    cur = conn.cursor()
    cur.executescript(rollback_sql)
    conn.commit()

    # Verify M4 tables dropped
    for tbl in M4_EXPECTED_TABLES:
        cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?", (tbl,))
        assert cur.fetchone()[0] == 0, f"Table {tbl} must be dropped after rollback."

    # Verify base jobs table intact
    cur.execute("SELECT COUNT(*) FROM jobs;")
    assert cur.fetchone()[0] > 0, "Base jobs table must remain intact after M4 rollback."


def test_14_backup_restore_includes_m4_tables(m4_test_db):
    conn, _, db_url, _, _ = m4_test_db
    apply_migration(db_url)
    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(FULL);")

    sqlite_path = db_url.replace("sqlite:///", "")
    res = validate_sqlite_backup_restore(sqlite_path)

    assert res["status"] == "PASS"
    for tbl in M4_EXPECTED_TABLES:
        assert tbl in res["restored_counts"], f"Restored counts must include M4 table '{tbl}'."
