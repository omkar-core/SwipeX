"""
Milestone 4 Day 5 — Production Finalization & Verification Test Suite

Verifies:
1. Final M4 schema integrity across all 18 tables (M1-M4).
2. DDL migration & rollback script syntax and presence.
3. Operational notes and data dictionary documentation completeness.
4. Data backup/restore integrity script execution.
5. End-to-end M1-M4 data integrity and business rules.
"""

import os
import sqlite3
import pytest
from datetime import datetime, date

from data_hanith.db.connection import init_db
from data_hanith.db.repositories.application_repository import ApplicationRepository
from data_hanith.db.repositories.notification_repository import NotificationRepository
from data_hanith.db.repositories.analytics_repository import AnalyticsRepository
from data_hanith.services.job_indicators import classify_company_type, compute_competition_level, compute_early_applicant_status
from data_hanith.scripts.generate_daily_analytics_snapshots import run_snapshot_generation
from data_hanith.scripts.validate_day5_backup_restore import validate_sqlite_backup_restore


@pytest.fixture
def temp_db(tmp_path):
    """Creates a temporary SQLite database initialized with full M1-M4 schema."""
    db_file = tmp_path / "test_m4_day5_final.db"
    db_url = f"sqlite:///{db_file}"
    init_db(db_url)
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


def test_schema_completeness_18_tables(temp_db):
    """Verify all 18 system tables (M1-M4) exist in database."""
    cursor = temp_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row["name"] for row in cursor.fetchall()}

    expected_tables = {
        # M2
        "jobs", "companies", "skills", "job_skills", "job_keywords",
        # M3
        "resumes", "resume_versions", "ats_scores", "swipes", "saved_jobs",
        # M4
        "applications", "application_status_events", "resume_version_views",
        "notifications", "notification_deliveries", "alert_preferences",
        "daily_application_analytics", "daily_hiring_trend_analytics"
    }

    missing = expected_tables - tables
    assert len(missing) == 0, f"Missing system tables: {missing}"
    assert len(expected_tables) == 18


def test_migration_and_rollback_scripts_exist():
    """Verify 004 DDL migration and rollback SQL files exist and contain valid DDL statements."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    migration_file = os.path.join(base_dir, "data_hanith", "db", "migrations", "004_m4_schema_extension.sql")
    rollback_file = os.path.join(base_dir, "data_hanith", "db", "migrations", "004_m4_rollback.sql")

    assert os.path.exists(migration_file), f"Migration file missing: {migration_file}"
    assert os.path.exists(rollback_file), f"Rollback file missing: {rollback_file}"

    with open(migration_file, "r", encoding="utf-8") as f:
        mig_content = f.read()
    with open(rollback_file, "r", encoding="utf-8") as f:
        roll_content = f.read()

    assert "CREATE TABLE IF NOT EXISTS applications" in mig_content
    assert "CREATE TABLE IF NOT EXISTS daily_hiring_trend_analytics" in mig_content
    assert "DROP TABLE IF EXISTS applications" in roll_content
    assert "DROP TABLE IF EXISTS daily_hiring_trend_analytics" in roll_content


def test_data_dictionary_and_operational_notes_exist():
    """Verify Data Dictionary and Operational Notes markdown documentation exist and have content."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dict_file = os.path.join(base_dir, "data_hanith", "docs", "m4_data_dictionary.md")
    notes_file = os.path.join(base_dir, "data_hanith", "docs", "m4_operational_notes.md")

    assert os.path.exists(dict_file), f"Data dictionary missing: {dict_file}"
    assert os.path.exists(notes_file), f"Operational notes missing: {notes_file}"

    with open(dict_file, "r", encoding="utf-8") as f:
        dict_content = f.read()
    with open(notes_file, "r", encoding="utf-8") as f:
        notes_content = f.read()

    assert "SwipeX Data Dictionary" in dict_content
    assert "2.1 `applications`" in dict_content
    assert "SwipeX Operational & Maintenance Guide" in notes_content
    assert "Competition Level Calculation" in notes_content


def test_backup_restore_script_verification(tmp_path):
    """Verify backup & restore script runs without errors on initialized database."""
    db_file = tmp_path / "test_m4_day5_backup_source.db"
    db_url = f"sqlite:///{db_file}"
    init_db(db_url)

    result = validate_sqlite_backup_restore(str(db_file))
    assert result["status"] == "PASS"
    assert result["db_type"] == "sqlite"
    assert len(result["live_counts"]) == 18


def test_end_to_end_m4_data_integrity_flow(temp_db):
    """Verify full end-to-end data lifecycle from job creation through applications, indicators, notifications, and analytics."""
    cursor = temp_db.cursor()

    # 1. Seed Company & Skill
    cursor.execute("""
        INSERT INTO companies (id, raw_company_id, name, company_type)
        VALUES ('comp-1', 101, 'TechCorp Startup', 'Tech Startup')
    """)
    cursor.execute("INSERT INTO skills (id, name, category, created_at) VALUES ('skill-1', 'Python', 'Programming', '2026-10-01')")
    
    # 2. Seed Job
    cursor.execute("""
        INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, posted_at_raw, posted_at_approx, applicant_count, min_salary, max_salary, currency, location)
        VALUES ('job-1', 201, 'comp-1', 'Senior Backend Dev', 'Python dev role', '2026-10-01', '2026-10-01 10:00:00', 0, 100000, 150000, 'USD', 'Remote')
    """)
    cursor.execute("INSERT INTO job_skills (job_id, skill_id) VALUES ('job-1', 'skill-1')")
    temp_db.commit()

    # 3. Create Application via ApplicationRepository
    app_repo = ApplicationRepository(temp_db, "sqlite")
    app = app_repo.create_application(user_id="user-100", job_id="job-1")
    assert app is not None
    assert app["status"] == "APPLIED"

    # Verify atomic counter increment
    cursor.execute("SELECT applicant_count FROM jobs WHERE id='job-1'")
    job_row = cursor.fetchone()
    assert job_row["applicant_count"] == 1

    # 4. Verify Indicators
    comp_type = classify_company_type("Tech Startup")
    assert comp_type == "STARTUP"

    comp_level = compute_competition_level(applicant_count=1, posted_at_approx="2026-10-01 10:00:00")
    assert comp_level == "LOW"

    early_bool, early_status = compute_early_applicant_status(applied_at=datetime.now(), posted_at_approx=None)
    assert early_bool is None
    assert early_status == "UNAVAILABLE"

    # 5. Create Notification via NotificationRepository
    notif_repo = NotificationRepository(temp_db, "sqlite")
    notif = notif_repo.create_notification(
        user_id="user-100",
        notification_type="APPLICATION_STATUS_CHANGE",
        title="Application Received",
        message="Your application has been received.",
        related_job_id="job-1",
        related_application_id=app["id"]
    )
    assert notif is not None
    assert notif["is_read"] == 0

    # 6. Generate Analytics Snapshots
    snapshot_date = "2026-10-08"
    analytics_repo = AnalyticsRepository(temp_db, "sqlite")
    app_rows = analytics_repo.generate_daily_application_analytics(snapshot_date=snapshot_date)
    trend_rows = analytics_repo.generate_daily_hiring_trend_analytics(snapshot_date=snapshot_date)
    assert app_rows >= 1
    assert trend_rows >= 1

    # 7. Query Analytics via AnalyticsRepository
    funnel = analytics_repo.get_application_funnel(job_id="job-1")
    assert funnel["total_applications"] == 1
    assert funnel["applied_count"] == 1

    hiring_trends = analytics_repo.get_hiring_trends(company_type_category="STARTUP")
    assert len(hiring_trends) == 1
    assert hiring_trends[0]["jobs_posted_count"] == 1
    assert hiring_trends[0]["applications_received_count"] == 1
