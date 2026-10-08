"""
Automated Test Suite for Milestone 2 Day 4 — Job Freshness & Competition Indicators.
Validates indicator logic, boundary conditions, null safety, and API exposure.
"""
import os
import sys
import pytest
from datetime import datetime, timedelta, timezone
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
from services.job_indicators import compute_freshness_level, compute_competition_level


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


# =============================================================================
# FRESHNESS UNIT TESTS
# =============================================================================

def test_freshness_fresh_recent():
    ref = datetime(2026, 9, 15, 12, 0, 0, tzinfo=timezone.utc)

    # 0 days ago -> FRESH
    d0 = ref
    assert compute_freshness_level(posted_at_approx=d0, ref_date=ref) == "FRESH"

    # 5 days ago -> FRESH
    d5 = ref - timedelta(days=5)
    assert compute_freshness_level(posted_at_approx=d5, ref_date=ref) == "FRESH"

    # 7 days ago -> FRESH (boundary)
    d7 = ref - timedelta(days=7)
    assert compute_freshness_level(posted_at_approx=d7, ref_date=ref) == "FRESH"

    # 10 days ago -> RECENT
    d10 = ref - timedelta(days=10)
    assert compute_freshness_level(posted_at_approx=d10, ref_date=ref) == "RECENT"

    # 14 days ago -> RECENT (boundary)
    d14 = ref - timedelta(days=14)
    assert compute_freshness_level(posted_at_approx=d14, ref_date=ref) == "RECENT"


def test_freshness_aging_stale():
    ref = datetime(2026, 9, 15, 12, 0, 0, tzinfo=timezone.utc)

    # 15 days ago -> AGING
    d15 = ref - timedelta(days=15)
    assert compute_freshness_level(posted_at_approx=d15, ref_date=ref) == "AGING"

    # 30 days ago -> AGING (boundary)
    d30 = ref - timedelta(days=30)
    assert compute_freshness_level(posted_at_approx=d30, ref_date=ref) == "AGING"

    # 31 days ago -> STALE
    d31 = ref - timedelta(days=31)
    assert compute_freshness_level(posted_at_approx=d31, ref_date=ref) == "STALE"

    # 60 days ago -> STALE
    d60 = ref - timedelta(days=60)
    assert compute_freshness_level(posted_at_approx=d60, ref_date=ref) == "STALE"


def test_freshness_null_date_fallback():
    ref = datetime(2026, 9, 15, 12, 0, 0, tzinfo=timezone.utc)
    c_recent = ref - timedelta(days=3)
    c_old = ref - timedelta(days=40)

    # Fallback to posted_at_raw relative string
    assert compute_freshness_level(posted_at_raw="Just Now", ref_date=ref) == "FRESH"
    assert compute_freshness_level(posted_at_raw="3 Days Ago", ref_date=ref) == "FRESH"
    assert compute_freshness_level(posted_at_raw="10 Days Ago", ref_date=ref) == "RECENT"
    assert compute_freshness_level(posted_at_raw="20 Days Ago", ref_date=ref) == "AGING"
    assert compute_freshness_level(posted_at_raw="45 Days Ago", ref_date=ref) == "STALE"
    assert compute_freshness_level(posted_at_raw="Starts in 1-3 months", ref_date=ref) == "FRESH"

    # Fallback to created_at when both approx and raw are None/unparseable
    assert compute_freshness_level(created_at=c_recent, ref_date=ref) == "FRESH"
    assert compute_freshness_level(created_at=c_old, ref_date=ref) == "STALE"

    # Completely empty/None inputs -> STALE default
    assert compute_freshness_level() == "STALE"


def test_freshness_boundary_conditions():
    ref = datetime(2026, 9, 15, 12, 0, 0, tzinfo=timezone.utc)

    # ISO string parsing support
    iso_fresh = (ref - timedelta(days=2)).isoformat()
    iso_aging = (ref - timedelta(days=25)).isoformat()

    assert compute_freshness_level(posted_at_approx=iso_fresh, ref_date=ref) == "FRESH"
    assert compute_freshness_level(posted_at_approx=iso_aging, ref_date=ref) == "AGING"

    # Future date (negative delta) clamps to age 0 -> FRESH
    future_date = ref + timedelta(days=5)
    assert compute_freshness_level(posted_at_approx=future_date, ref_date=ref) == "FRESH"


# =============================================================================
# COMPETITION UNIT TESTS
# =============================================================================

def test_competition_low():
    assert compute_competition_level(0) == "LOW"
    assert compute_competition_level(1) == "LOW"
    assert compute_competition_level(9) == "LOW"
    assert compute_competition_level(None) == "LOW"


def test_competition_medium():
    assert compute_competition_level(10) == "MEDIUM"
    assert compute_competition_level(25) == "MEDIUM"
    assert compute_competition_level(49) == "MEDIUM"


def test_competition_high():
    assert compute_competition_level(50) == "HIGH"
    assert compute_competition_level(51) == "HIGH"
    assert compute_competition_level(100) == "HIGH"
    assert compute_competition_level(1000) == "HIGH"


def test_competition_valid_tier_guarantee():
    for count in [-5, 0, 9, 10, 50, 51, 999]:
        tier = compute_competition_level(count)
        assert tier in ("LOW", "MEDIUM", "HIGH")


# =============================================================================
# API EXPOSURE INTEGRATION TESTS
# =============================================================================

def test_job_list_exposes_indicators(api_client):
    res = api_client.get("/api/v1/jobs?page_size=10")
    assert res.status_code == 200
    jobs = res.json()
    assert len(jobs) > 0

    for job in jobs:
        assert "freshness_level" in job
        assert job["freshness_level"] in ("FRESH", "RECENT", "AGING", "STALE")
        assert "applicant_count" in job
        assert isinstance(job["applicant_count"], int)
        assert job["applicant_count"] >= 0
        assert "competition_level" in job
        assert job["competition_level"] in ("LOW", "MEDIUM", "HIGH")


def test_job_detail_exposes_indicators(api_client):
    # Fetch first job summary to get UUID
    list_res = api_client.get("/api/v1/jobs?page_size=1")
    assert list_res.status_code == 200
    first_job_id = list_res.json()[0]["job_id"]

    detail_res = api_client.get(f"/api/v1/jobs/{first_job_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    assert "freshness_level" in detail
    assert detail["freshness_level"] in ("FRESH", "RECENT", "AGING", "STALE")
    assert "applicant_count" in detail
    assert isinstance(detail["applicant_count"], int)
    assert detail["applicant_count"] >= 0
    assert "competition_level" in detail
    assert detail["competition_level"] in ("LOW", "MEDIUM", "HIGH")
