"""
Automated Verification Test Suite for Dataset 1 Ingestion Pipeline & Canonical Data Model.
Tests all 97,929 ingested records against approved canonical data rules.
"""
import os
import sys
import sqlite3
import pytest

# Add data_hanith to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVICE_DIR = os.path.join(BASE_DIR, "data_hanith")
sys.path.insert(0, SERVICE_DIR)

from config import RAW_DATASET1_PATH, DATASET_REF_TIMESTAMP
from scripts.ingest_dataset1 import run_ingestion


@pytest.fixture(scope="module")
def db_context(tmp_path_factory):
    """
    Runs ingestion pipeline into a isolated temporary SQLite test database.
    """
    test_db_path = str(tmp_path_factory.mktemp("db") / "test_swipex_job.db")
    test_db_url = f"sqlite:///{test_db_path}"

    stats = run_ingestion(dataset_path=RAW_DATASET1_PATH, db_url=test_db_url)

    conn = sqlite3.connect(test_db_path)
    yield conn, stats
    conn.close()


def test_job_count(db_context):
    conn, stats = db_context
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM jobs;")
    count = cursor.fetchone()[0]
    assert count == 97929, f"Expected 97,929 jobs, got {count}"
    assert stats["total_jobs"] == 97929


def test_duplicate_raw_job_ids(db_context):
    conn, _ = db_context
    cursor = conn.cursor()
    cursor.execute("SELECT raw_job_id, COUNT(*) FROM jobs GROUP BY raw_job_id HAVING COUNT(*) > 1;")
    dups = cursor.fetchall()
    assert len(dups) == 250, f"Expected 250 duplicate raw_job_id records, got {len(dups)}"

    cursor.execute("SELECT COUNT(*) FROM jobs WHERE raw_job_id IN (SELECT raw_job_id FROM jobs GROUP BY raw_job_id HAVING COUNT(*) > 1);")
    dup_rows = cursor.fetchone()[0]
    assert dup_rows == 500, f"Expected 500 total duplicate rows, got {dup_rows}"


def test_undisclosed_salary_rule(db_context):
    conn, _ = db_context
    cursor = conn.cursor()
    # Undisclosed salary rows (salary == 'Not disclosed' or min/max salary == 0.0 in raw data) = 64,700
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE min_salary IS NULL AND max_salary IS NULL;")
    null_salary_count = cursor.fetchone()[0]
    assert null_salary_count == 64700, f"Expected 64,700 null salary rows, got {null_salary_count}"

    # Verify zero salary 0.0 entries exist in jobs table
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE min_salary = 0 OR max_salary = 0;")
    zero_salary_count = cursor.fetchone()[0]
    assert zero_salary_count == 0, f"Rule #4 violation: Found {zero_salary_count} rows with salary=0 instead of NULL"


def test_currency_preservation(db_context):
    conn, _ = db_context
    cursor = conn.cursor()
    cursor.execute("SELECT currency, COUNT(*) FROM jobs GROUP BY currency;")
    currencies = dict(cursor.fetchall())
    assert currencies.get("INR") == 97800, f"Expected 97,800 INR jobs, got {currencies.get('INR')}"
    assert currencies.get("USD") == 129, f"Expected 129 USD jobs, got {currencies.get('USD')}"

    cursor.execute("SELECT COUNT(*) FROM jobs WHERE currency IS NULL;")
    null_curr = cursor.fetchone()[0]
    assert null_curr == 0, "Currency contains NULL values"


def test_missing_company_name(db_context):
    conn, _ = db_context
    cursor = conn.cursor()
    # CompanyId 1346914 has 4 rows with missing companyName in raw data, resolved via companyId mapping
    cursor.execute("SELECT name FROM companies WHERE raw_company_id = 1346914;")
    comp_name = cursor.fetchone()[0]
    assert comp_name == "Morepen Laboratories", f"Expected 'Morepen Laboratories' for companyId 1346914, got {comp_name}"

    cursor.execute("SELECT COUNT(*) FROM companies WHERE name = 'Unknown Company';")
    fake_comp_names = cursor.fetchone()[0]
    assert fake_comp_names == 0, "Found invented 'Unknown Company' text in companies table!"


def test_posted_at_deterministic_parsing(db_context):
    conn, _ = db_context
    cursor = conn.cursor()
    # Check relative past posting "4 Days Ago" -> 2024-12-28
    cursor.execute("SELECT posted_at_approx FROM jobs WHERE posted_at_raw = '4 Days Ago' LIMIT 1;")
    val = cursor.fetchone()[0]
    assert val.startswith("2024-12-28"), f"Expected 2024-12-28 for '4 Days Ago', got {val}"

    # Check future start string "Starts in 1-3 months" -> NULL
    cursor.execute("SELECT posted_at_approx FROM jobs WHERE posted_at_raw = 'Starts in 1-3 months' LIMIT 1;")
    future_val = cursor.fetchone()[0]
    assert future_val is None, f"Expected NULL posted_at_approx for future start string, got {future_val}"


def test_nullable_unpopulated_fields(db_context):
    conn, _ = db_context
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE work_mode IS NOT NULL OR job_type IS NOT NULL;")
    non_null_job_types = cursor.fetchone()[0]
    assert non_null_job_types == 0, f"Expected 0 populated work_mode/job_type, got {non_null_job_types}"

    cursor.execute("SELECT COUNT(*) FROM companies WHERE company_type IS NOT NULL;")
    non_null_comp_types = cursor.fetchone()[0]
    assert non_null_comp_types == 0, f"Expected 0 populated company_type, got {non_null_comp_types}"


def test_skills_and_job_skills(db_context):
    conn, stats = db_context
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM skills;")
    sk_count = cursor.fetchone()[0]
    assert sk_count > 0, "No skills ingested"

    cursor.execute("SELECT COUNT(*) FROM job_skills;")
    js_count = cursor.fetchone()[0]
    assert js_count > 0, "No job_skills ingested"

    # Verify column count of job_skills (must be 2: job_id, skill_id; no is_required)
    cursor.execute("PRAGMA table_info(job_skills);")
    cols = [r[1] for r in cursor.fetchall()]
    assert "is_required" not in cols, "Rule violation: is_required column found in job_skills!"
    assert set(cols) == {"job_id", "skill_id"}, f"Unexpected job_skills schema columns: {cols}"
