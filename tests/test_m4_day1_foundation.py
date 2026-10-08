"""
Milestone 4 Foundation & Data Layer Tests.
Tests M4 schema migration, mutually exclusive competition formula, NULL posting date semantics,
reference clock provider, application status transitions/history, notifications, and alert preferences.
"""
import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta, timezone

# Add data_hanith to python path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data_hanith"))
sys.path.insert(0, BASE_DIR)

from config import DATASET_REF_TIMESTAMP, get_reference_time
from db.connection import get_raw_connection, init_db
from services.job_indicators import (
    compute_competition_level,
    compute_early_applicant_status,
    compute_is_recently_posted,
    parse_datetime_utc
)
from db.repositories.application_repository import ApplicationRepository
from db.repositories.notification_repository import NotificationRepository
from scripts.apply_m4_migration import apply_migration


@pytest.fixture
def test_db():
    """Creates a fresh, isolated temporary SQLite database for testing M4 foundation."""
    db_file = os.path.join(BASE_DIR, "data", f"test_m4_foundation_{uuid.uuid4().hex}.db")
    db_url = f"sqlite:///{db_file}"

    schema_sql_path = os.path.join(BASE_DIR, "db", "schema.sql")
    init_db(db_url, schema_sql_path)

    # Apply M4 migration
    res = apply_migration(db_url)
    assert res is True, "M4 migration must succeed on fresh database."

    conn, db_type = get_raw_connection(db_url)

    yield conn, db_type, db_url

    conn.close()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except OSError:
            pass


# -----------------------------------------------------------------------------
# 1. COMPETITION FORMULA & BOUNDARY TESTS
# -----------------------------------------------------------------------------
def test_competition_formula_boundary_conditions():
    ref = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    # Case 1: A=5, Age=1 day -> LOW (A < 10)
    posted_1d = (ref - timedelta(days=1)).isoformat()
    assert compute_competition_level(5, posted_1d, ref) == "LOW"

    # Case 2: A=15, Age=40 days -> LOW (A < 20 and Age > 30 days)
    posted_40d = (ref - timedelta(days=40)).isoformat()
    assert compute_competition_level(15, posted_40d, ref) == "LOW"

    # Case 3: A=15, Age=14 days -> MEDIUM (10 <= A < 20 and Age <= 30)
    posted_14d = (ref - timedelta(days=14)).isoformat()
    assert compute_competition_level(15, posted_14d, ref) == "MEDIUM"

    # Case 4: A=25, Age=5 days -> HIGH (A >= 20 and Age <= 7 days)
    posted_5d = (ref - timedelta(days=5)).isoformat()
    assert compute_competition_level(25, posted_5d, ref) == "HIGH"

    # Case 5: A=25, Age=10 days -> MEDIUM (A >= 20, but Age > 7 and A < 50)
    posted_10d = (ref - timedelta(days=10)).isoformat()
    assert compute_competition_level(25, posted_10d, ref) == "MEDIUM"

    # Case 6: A=55, Age=60 days -> HIGH (A >= 50)
    posted_60d = (ref - timedelta(days=60)).isoformat()
    assert compute_competition_level(55, posted_60d, ref) == "HIGH"


def test_competition_formula_null_posting_date():
    # NULL posting date defaults strictly to count-based fallback
    assert compute_competition_level(5, None) == "LOW"
    assert compute_competition_level(15, None) == "MEDIUM"
    assert compute_competition_level(55, None) == "HIGH"


# -----------------------------------------------------------------------------
# 2. EARLY APPLICANT NULL SEMANTICS & FRESHNESS TESTS
# -----------------------------------------------------------------------------
def test_early_applicant_null_semantics():
    ref = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    posted_iso = (ref - timedelta(hours=10)).isoformat()
    applied_early = (ref - timedelta(hours=2)).isoformat()
    applied_late = (ref + timedelta(hours=50)).isoformat()

    # 1. Early applicant TRUE
    is_early, status = compute_early_applicant_status(applied_early, posted_iso, window_hours=48)
    assert is_early is True
    assert status == "EARLY"

    # 2. Early applicant FALSE
    is_early_l, status_l = compute_early_applicant_status(applied_late, posted_iso, window_hours=48)
    assert is_early_l is False
    assert status_l == "REGULAR"

    # 3. NULL posting date -> is_early is None (NULL), status = "UNAVAILABLE"
    is_early_null, status_null = compute_early_applicant_status(applied_early, None, window_hours=48)
    assert is_early_null is None
    assert status_null == "UNAVAILABLE"


def test_reference_clock_provider():
    ref = get_reference_time()
    assert isinstance(ref, datetime)
    assert ref.tzinfo is not None
    assert ref.year >= 2025


# -----------------------------------------------------------------------------
# 3. APPLICATION REPOSITORY & TRANSACTION TESTS
# -----------------------------------------------------------------------------
def test_application_creation_transaction(test_db):
    conn, db_type, _ = test_db
    cur = conn.cursor()

    # Seed company & job
    comp_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    ref_time = get_reference_time()
    posted_iso = (ref_time - timedelta(days=2)).isoformat()

    cur.execute(
        "INSERT INTO companies (id, raw_company_id, name, created_at, updated_at) VALUES (?, 101, 'Test Corp', ?, ?)",
        (comp_id, ref_time.isoformat(), ref_time.isoformat())
    )
    cur.execute(
        """INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, min_salary, max_salary, currency, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
           VALUES (?, 201, ?, 'Backend Dev', 'Desc', 100000, 150000, 'INR', 'Bangalore', 8, 'LOW', '2 Days Ago', ?, ?, ?)""",
        (job_id, comp_id, posted_iso, ref_time.isoformat(), ref_time.isoformat())
    )
    conn.commit()

    repo = ApplicationRepository(conn, db_type)

    # Create application
    app_data = repo.create_application(
        user_id=user_id,
        job_id=job_id,
        applied_at=ref_time.isoformat()
    )

    assert app_data["id"] is not None
    assert app_data["status"] == "APPLIED"
    assert app_data["applicant_count"] == 9  # Incremented from 8 to 9
    assert app_data["is_early_applicant"] is True  # Applied 2 days after posting (within 48h deadline)

    # Verify job record updated in DB
    cur.execute("SELECT applicant_count, competition_level FROM jobs WHERE id = ?", (job_id,))
    row = cur.fetchone()
    assert row[0] == 9

    # Verify status history logged
    history = repo.get_application_status_history(app_data["id"])
    assert len(history) == 1
    assert history[0]["previous_status"] is None
    assert history[0]["new_status"] == "APPLIED"
    assert history[0]["actor_role"] == "JOB_SEEKER"


def test_application_status_transition_and_validation(test_db):
    conn, db_type, _ = test_db
    cur = conn.cursor()

    comp_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    ref_time = get_reference_time()

    cur.execute("INSERT INTO companies (id, raw_company_id, name) VALUES (?, 102, 'Acme')", (comp_id,))
    cur.execute("INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, currency, location, posted_at_raw) VALUES (?, 202, ?, 'FE', 'Desc', 'INR', 'Remote', 'Today')", (job_id, comp_id))
    conn.commit()

    repo = ApplicationRepository(conn, db_type)
    app = repo.create_application(user_id=user_id, job_id=job_id)

    # Transition to SHORTLISTED
    updated = repo.update_application_status(
        application_id=app["id"],
        new_status="SHORTLISTED",
        actor_id="recruiter_1",
        actor_role="RECRUITER",
        notes="Strong resume match"
    )
    assert updated["new_status"] == "SHORTLISTED"
    assert updated["previous_status"] == "APPLIED"

    # Transition to WITHDRAWN
    updated_w = repo.update_application_status(
        application_id=app["id"],
        new_status="WITHDRAWN",
        actor_id=user_id,
        actor_role="JOB_SEEKER",
        notes="Accepted another offer"
    )
    assert updated_w["new_status"] == "WITHDRAWN"

    # Invalid status raises ValueError
    with pytest.raises(ValueError):
        repo.update_application_status(app["id"], "INVALID_STATUS")

    # Verify full history
    history = repo.get_application_status_history(app["id"])
    assert len(history) == 3
    assert [h["new_status"] for h in history] == ["APPLIED", "SHORTLISTED", "WITHDRAWN"]


# -----------------------------------------------------------------------------
# 4. NOTIFICATION & ALERT PREFERENCES TESTS
# -----------------------------------------------------------------------------
def test_alert_preferences_crud(test_db):
    conn, db_type, _ = test_db
    user_id = str(uuid.uuid4())
    repo = NotificationRepository(conn, db_type)

    # Default preferences
    default_prefs = repo.get_alert_preferences(user_id)
    assert default_prefs["instant_job"] is True
    assert default_prefs["match_threshold"] == 70.0

    # Upsert preferences
    saved = repo.upsert_alert_preferences(
        user_id=user_id,
        instant_job=True,
        startup_hiring=False,
        high_match=True,
        low_competition=False,
        channel_in_app=True,
        channel_email=True,
        channel_push=True,
        match_threshold=85.5,
        quiet_hours_enabled=True,
        quiet_hours_start="23:00:00",
        quiet_hours_end="07:00:00"
    )

    assert saved["startup_hiring"] is False
    assert saved["channel_push"] is True
    assert saved["match_threshold"] == 85.5
    assert saved["quiet_hours_enabled"] is True


def test_notification_creation_and_unread_count(test_db):
    conn, db_type, _ = test_db
    user_id = str(uuid.uuid4())
    repo = NotificationRepository(conn, db_type)

    # Create notification
    notif = repo.create_notification(
        user_id=user_id,
        notification_type="HIGH_MATCH",
        title="High Match Job Alert",
        message="New job matching 90% of your profile.",
        payload={"job_id": "job_123", "match_score": 90.0}
    )

    assert notif["id"] is not None
    assert notif["is_read"] is False
    assert len(notif["deliveries"]) >= 1

    # Verify unread count is 1
    unread = repo.get_unread_count(user_id)
    assert unread == 1

    # Fetch user notifications
    user_notifs = repo.get_user_notifications(user_id)
    assert len(user_notifs) == 1
    assert user_notifs[0]["title"] == "High Match Job Alert"

    # Mark as read
    marked = repo.mark_notification_as_read(notif["id"], user_id)
    assert marked is True

    # Unread count should now be 0
    assert repo.get_unread_count(user_id) == 0
