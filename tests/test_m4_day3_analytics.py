"""
Milestone 4 Day 3 Analytics Test Suite.
Tests daily_application_analytics snapshots, daily_hiring_trend_analytics snapshots,
application funnel metrics, resume-version performance tracking, skills-in-demand queries,
hiring trend time-series, and recommendation insight data structures.
"""
import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data_hanith"))
sys.path.insert(0, BASE_DIR)

from config import get_reference_time
from db.connection import get_raw_connection, init_db
from db.repositories.application_repository import ApplicationRepository
from db.repositories.analytics_repository import AnalyticsRepository
from services.job_indicators import classify_company_type
from scripts.apply_m4_migration import apply_migration
from scripts.generate_daily_analytics_snapshots import run_snapshot_generation


@pytest.fixture
def analytics_test_db():
    """Creates a fresh, isolated temporary SQLite database populated with baseline analytics data."""
    db_file = os.path.join(BASE_DIR, "data", f"test_m4_day3_{uuid.uuid4().hex}.db")
    db_url = f"sqlite:///{db_file}"

    schema_sql_path = os.path.join(BASE_DIR, "db", "schema.sql")
    init_db(db_url, schema_sql_path)
    apply_migration(db_url)

    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()

    ref_time = get_reference_time()
    ref_iso = ref_time.isoformat()

    # Seed 2 Companies (1 Startup, 1 MNC)
    comp_startup_id = str(uuid.uuid4())
    comp_mnc_id = str(uuid.uuid4())

    cur.execute("INSERT INTO companies (id, raw_company_id, name, company_type, created_at, updated_at) VALUES (?, 4001, 'AI Startup Inc', 'Early Stage Startup', ?, ?)", (comp_startup_id, ref_iso, ref_iso))
    cur.execute("INSERT INTO companies (id, raw_company_id, name, company_type, created_at, updated_at) VALUES (?, 4002, 'Global Corp', 'Multinational MNC', ?, ?)", (comp_mnc_id, ref_iso, ref_iso))

    # Seed 2 Jobs
    job1_id = str(uuid.uuid4())
    job2_id = str(uuid.uuid4())

    cur.execute(
        """INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, min_salary, max_salary, currency, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
           VALUES (?, 5001, ?, 'Python Dev', 'Description', 800000, 1200000, 'INR', 'Bangalore', 0, 'LOW', 'Today', ?, ?, ?)""",
        (job1_id, comp_startup_id, ref_iso, ref_iso, ref_iso)
    )
    cur.execute(
        """INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, min_salary, max_salary, currency, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
           VALUES (?, 5002, ?, 'Data Engineer', 'Description', 1500000, 2500000, 'INR', 'Mumbai', 0, 'LOW', 'Today', ?, ?, ?)""",
        (job2_id, comp_mnc_id, ref_iso, ref_iso, ref_iso)
    )

    # Seed 2 Skills
    sk_py_id = str(uuid.uuid4())
    sk_sql_id = str(uuid.uuid4())

    cur.execute("INSERT INTO skills (id, name, category, created_at) VALUES (?, 'Python', 'Backend', ?)", (sk_py_id, ref_iso))
    cur.execute("INSERT INTO skills (id, name, category, created_at) VALUES (?, 'SQL', 'Database', ?)", (sk_sql_id, ref_iso))

    # Map job1 to Python + SQL, job2 to SQL
    cur.execute("INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)", (job1_id, sk_py_id))
    cur.execute("INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)", (job1_id, sk_sql_id))
    cur.execute("INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)", (job2_id, sk_sql_id))

    # Seed 1 Resume & Resume Version
    user_id = str(uuid.uuid4())
    resume_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())

    cur.execute("INSERT INTO resumes (id, user_id, title, created_at, updated_at) VALUES (?, ?, 'Primary Resume', ?, ?)", (resume_id, user_id, ref_iso, ref_iso))
    cur.execute("INSERT INTO resume_versions (id, resume_id, file_name, file_path, raw_text, parsed_json, version_number, is_active, created_at) VALUES (?, ?, 'v1.pdf', '/path/v1.pdf', 'Text', '{}', 1, 1, ?)", (version_id, resume_id, ref_iso))

    conn.commit()

    yield conn, db_type, db_url, user_id, job1_id, job2_id, version_id, sk_py_id, sk_sql_id

    conn.close()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except OSError:
            pass


# -----------------------------------------------------------------------------
# 1. COMPANY CLASSIFICATION TESTS
# -----------------------------------------------------------------------------
def test_1_company_type_classification_mapping():
    # Approved STARTUP rule: explicitly contains "Startup"
    assert classify_company_type("Startup") == "STARTUP"
    assert classify_company_type("Tech Startup") == "STARTUP"

    # Approved MNC rule: explicitly contains "MNC" or "Multinational"
    assert classify_company_type("MNC") == "MNC"
    assert classify_company_type("Global MNC") == "MNC"
    assert classify_company_type("Multinational") == "MNC"
    assert classify_company_type("Multinational Corporation") == "MNC"

    # Approved OTHER rule: everything else
    assert classify_company_type("Corporate") == "OTHER"
    assert classify_company_type("Conglomerate") == "OTHER"
    assert classify_company_type("Enterprise") == "OTHER"
    assert classify_company_type("Private") == "OTHER"
    assert classify_company_type("Public") == "OTHER"
    assert classify_company_type(None) == "OTHER"



# -----------------------------------------------------------------------------
# 2. DAILY APPLICATION ANALYTICS SNAPSHOT TESTS
# -----------------------------------------------------------------------------
def test_2_daily_application_analytics_snapshot(analytics_test_db):
    conn, db_type, _, user_id, job1_id, _, version_id, _, _ = analytics_test_db
    app_repo = ApplicationRepository(conn, db_type)
    analytics_repo = AnalyticsRepository(conn, db_type)

    # User applies to job1
    app1 = app_repo.create_application(user_id=user_id, job_id=job1_id, resume_version_id=version_id)
    app_repo.update_application_status(app1["id"], new_status="SHORTLISTED")

    today_str = get_reference_time().date().isoformat()
    rows_generated = analytics_repo.generate_daily_application_analytics(snapshot_date=today_str)

    assert rows_generated >= 1

    cur = conn.cursor()
    cur.execute("SELECT snapshot_date, job_id, total_applications, shortlisted_count FROM daily_application_analytics WHERE job_id = ?", (job1_id,))
    row = cur.fetchone()
    assert row is not None
    assert row[0] == today_str
    assert row[1] == job1_id
    assert row[2] == 1  # total_applications
    assert row[3] == 1  # shortlisted_count


# -----------------------------------------------------------------------------
# 3. DAILY HIRING TREND ANALYTICS SNAPSHOT TESTS
# -----------------------------------------------------------------------------
def test_3_daily_hiring_trend_analytics_snapshot(analytics_test_db):
    conn, db_type, _, user_id, job1_id, _, _, _, _ = analytics_test_db
    app_repo = ApplicationRepository(conn, db_type)
    analytics_repo = AnalyticsRepository(conn, db_type)

    app_repo.create_application(user_id=user_id, job_id=job1_id)

    today_str = get_reference_time().date().isoformat()
    rows_generated = analytics_repo.generate_daily_hiring_trend_analytics(snapshot_date=today_str)

    assert rows_generated >= 1

    cur = conn.cursor()
    cur.execute("SELECT company_type_category, skill_id, jobs_posted_count, applications_received_count FROM daily_hiring_trend_analytics WHERE snapshot_date = ?", (today_str,))
    rows = cur.fetchall()
    assert len(rows) > 0

    categories = [r[0] for r in rows]
    assert "STARTUP" in categories or "MNC" in categories


# -----------------------------------------------------------------------------
# 4. APPLICATION FUNNEL ANALYTICS TESTS
# -----------------------------------------------------------------------------
def test_4_application_funnel_analytics(analytics_test_db):
    conn, db_type, _, user_id, job1_id, job2_id, version_id, _, _ = analytics_test_db
    app_repo = ApplicationRepository(conn, db_type)
    analytics_repo = AnalyticsRepository(conn, db_type)

    # Create 2 applications: 1 INTERVIEW, 1 APPLIED
    app1 = app_repo.create_application(user_id=user_id, job_id=job1_id, resume_version_id=version_id)
    app_repo.update_application_status(app1["id"], new_status="SHORTLISTED")
    app_repo.update_application_status(app1["id"], new_status="INTERVIEW")

    user2_id = str(uuid.uuid4())
    app_repo.create_application(user_id=user2_id, job_id=job2_id)

    funnel = analytics_repo.get_application_funnel(job_id=job1_id)

    assert funnel["total_applications"] == 1
    assert funnel["interview_count"] == 1
    assert funnel["conversion_rates"]["overall_conversion_pct"] == 100.0


# -----------------------------------------------------------------------------
# 5. RESUME VERSION PERFORMANCE TRACKING TESTS
# -----------------------------------------------------------------------------
def test_5_resume_version_performance_analytics(analytics_test_db):
    conn, db_type, _, user_id, job1_id, _, version_id, _, _ = analytics_test_db
    app_repo = ApplicationRepository(conn, db_type)
    analytics_repo = AnalyticsRepository(conn, db_type)

    # Log 2 resume views
    analytics_repo.log_resume_version_view(resume_version_id=version_id, viewer_user_id=str(uuid.uuid4()), job_id=job1_id)
    analytics_repo.log_resume_version_view(resume_version_id=version_id, viewer_user_id=str(uuid.uuid4()), job_id=job1_id)

    # Submit 1 application using version_id -> status INTERVIEW
    app = app_repo.create_application(user_id=user_id, job_id=job1_id, resume_version_id=version_id)
    app_repo.update_application_status(app["id"], new_status="INTERVIEW")

    perf = analytics_repo.get_resume_version_performance(user_id=user_id)

    assert len(perf) == 1
    v_perf = perf[0]
    assert v_perf["resume_version_id"] == version_id
    assert v_perf["views_count"] == 2
    assert v_perf["applications_count"] == 1
    assert v_perf["interviews_count"] == 1
    assert v_perf["view_to_app_conversion_pct"] == 50.0  # 1 application / 2 views = 50.0%
    assert v_perf["app_to_interview_conversion_pct"] == 100.0


# -----------------------------------------------------------------------------
# 6. SKILLS-IN-DEMAND & HIRING TREND QUERIES TESTS
# -----------------------------------------------------------------------------
def test_6_skills_in_demand_and_hiring_trends(analytics_test_db):
    conn, db_type, _, _, _, _, _, _, _ = analytics_test_db
    analytics_repo = AnalyticsRepository(conn, db_type)

    # Populate snapshots
    analytics_repo.generate_daily_hiring_trend_analytics()

    skills = analytics_repo.get_skills_in_demand(limit=5)
    assert len(skills) > 0
    assert "name" in skills[0]

    trends = analytics_repo.get_hiring_trends()
    assert isinstance(trends, list)


# -----------------------------------------------------------------------------
# 7. CANDIDATE PERFORMANCE INSIGHTS TESTS
# -----------------------------------------------------------------------------
def test_7_candidate_performance_insights(analytics_test_db):
    conn, db_type, _, user_id, _, _, _, _, _ = analytics_test_db
    analytics_repo = AnalyticsRepository(conn, db_type)

    insights = analytics_repo.get_candidate_performance_insights(user_id=user_id)

    assert insights["user_id"] == user_id
    assert "application_funnel" in insights
    assert "resume_versions" in insights
    assert "recommended_in_demand_skills" in insights


# -----------------------------------------------------------------------------
# 8. ANALYTICS SNAPSHOT GENERATOR SCRIPT INTEGRATION TEST
# -----------------------------------------------------------------------------
def test_8_snapshot_generator_script_integration(analytics_test_db):
    _, _, db_url, _, _, _, _, _, _ = analytics_test_db
    res = run_snapshot_generation(db_url=db_url)

    assert res["status"] == "SUCCESS"
    assert res["application_snapshot_rows"] >= 0
    assert res["hiring_trend_snapshot_rows"] >= 0
