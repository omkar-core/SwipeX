"""
Milestone 2 — Day 6 Database Integrity QA & Dual-Level Performance Measurement Script.
Performs:
1. PostgreSQL Database Integrity QA (Zero orphan records, constraint compliance, nullability checks).
2. Database Query EXPLAIN ANALYZE Performance (SQL execution time and execution plan inspection).
3. API-Level Request/Response Latency Benchmarks (Wall-clock FastAPI endpoint response latency).
"""
import os
import sys
import time
from typing import Dict, Any

# Ensure DATABASE_URL targets live PostgreSQL database BEFORE importing config/app
if "DATABASE_URL" not in os.environ or "sqlite" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@127.0.0.1:5432/swipex_job_db"

# Add data_hanith to sys.path
SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from config import DATABASE_URL
from db.connection import get_raw_connection
from main import app
from fastapi.testclient import TestClient


def run_qa_and_performance_validation():
    print("==================================================")
    print("DAY 6 — DATABASE INTEGRITY QA & DUAL PERFORMANCE MEASUREMENT")
    print("==================================================")

    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()

    print(f"Target Database Engine: {db_type}")

    # -------------------------------------------------------------------------
    # PART 1: DATABASE INTEGRITY QA
    # -------------------------------------------------------------------------
    print("\n--- PART 1: DATABASE INTEGRITY QA ---")

    # 1. Row counts
    tables = ["jobs", "companies", "skills", "job_skills", "swipes", "saved_jobs"]
    counts = {}
    for tbl in tables:
        cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        counts[tbl] = cur.fetchone()[0]
        print(f" - Table '{tbl}': {counts[tbl]} rows")

    # 2. Orphan checks
    cur.execute("SELECT COUNT(*) FROM job_skills js LEFT JOIN jobs j ON js.job_id = j.id WHERE j.id IS NULL;")
    orphan_job_skills = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM jobs j LEFT JOIN companies c ON j.company_id = c.id WHERE c.id IS NULL;")
    orphan_jobs_companies = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM swipes s LEFT JOIN jobs j ON s.job_id = j.id WHERE j.id IS NULL;")
    orphan_swipes = cur.fetchone()[0]

    print(f"Orphan Checks:\n - job_skills without job: {orphan_job_skills}\n - jobs without company: {orphan_jobs_companies}\n - swipes without job: {orphan_swipes}")
    assert orphan_job_skills == 0, "Orphan job_skills records detected!"
    assert orphan_jobs_companies == 0, "Orphan jobs referencing missing companies detected!"
    assert orphan_swipes == 0, "Orphan swipes detected!"

    # 3. Constraint violation checks
    cur.execute("SELECT COUNT(*) FROM jobs WHERE competition_level NOT IN ('LOW', 'MEDIUM', 'HIGH') OR competition_level IS NULL;")
    invalid_comp = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM jobs WHERE applicant_count IS NULL OR applicant_count < 0;")
    invalid_app_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM companies WHERE about IS NULL OR size IS NULL OR industry IS NULL;")
    missing_comp_m2 = cur.fetchone()[0]

    print(f"Constraint Checks:\n - Invalid competition levels: {invalid_comp}\n - Invalid applicant counts: {invalid_app_count}\n - Missing M2 company fields: {missing_comp_m2}")
    assert invalid_comp == 0, "Invalid competition_level values found!"
    assert invalid_app_count == 0, "Invalid applicant_count values found!"
    assert missing_comp_m2 == 0, "Unpopulated M2 company metadata fields found!"

    # -------------------------------------------------------------------------
    # PART 2: DATABASE QUERY PERFORMANCE (EXPLAIN ANALYZE)
    # -------------------------------------------------------------------------
    print("\n--- PART 2: DATABASE QUERY EXPLAIN ANALYZE ---")

    # Sample IDs
    cur.execute("SELECT id FROM jobs LIMIT 1;")
    sample_job_id = str(cur.fetchone()[0])

    cur.execute("SELECT id FROM companies LIMIT 1;")
    sample_comp_id = str(cur.fetchone()[0])

    queries = {
        "1. Default Job Feed": """
            EXPLAIN ANALYZE
            SELECT j.id, j.title, c.name, j.location, j.min_salary, j.max_salary, j.currency, j.posted_at_raw, j.applicant_count, j.competition_level, j.posted_at_approx, j.created_at
            FROM jobs j LEFT JOIN companies c ON j.company_id = c.id
            ORDER BY j.created_at DESC, j.id ASC LIMIT 20 OFFSET 0;
        """,
        "2. Job Detail Lookup": f"""
            EXPLAIN ANALYZE
            SELECT j.id, j.raw_job_id, j.title, j.job_description, j.min_salary, j.max_salary, j.currency, j.min_experience, j.max_experience, j.raw_experience_str, j.location, j.work_mode, j.job_type, j.posted_at_raw, j.posted_at_approx, j.created_at, j.applicant_count, j.competition_level, c.id, c.raw_company_id, c.name, c.company_type, c.aggregate_rating, c.reviews_count
            FROM jobs j LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.id = '{sample_job_id}';
        """,
        "3. Location Substring Filter": """
            EXPLAIN ANALYZE
            SELECT j.id, j.title, c.name, j.location, j.applicant_count, j.competition_level
            FROM jobs j LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.location ILIKE '%Bengaluru%'
            ORDER BY j.created_at DESC, j.id ASC LIMIT 20 OFFSET 0;
        """,
        "4. Salary Range Filter": """
            EXPLAIN ANALYZE
            SELECT j.id, j.title, c.name, j.min_salary, j.max_salary, j.applicant_count, j.competition_level
            FROM jobs j LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.min_salary IS NOT NULL AND j.max_salary IS NOT NULL AND j.max_salary >= 300000 AND j.min_salary <= 600000
            ORDER BY j.created_at DESC, j.id ASC LIMIT 20 OFFSET 0;
        """,
        "5. Skills Match-Any Filter": """
            EXPLAIN ANALYZE
            SELECT j.id, j.title, c.name, j.applicant_count, j.competition_level
            FROM jobs j LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.id IN (
                SELECT js.job_id FROM job_skills js JOIN skills s ON js.skill_id = s.id WHERE LOWER(s.name) IN ('python', 'sql')
            )
            ORDER BY j.created_at DESC, j.id ASC LIMIT 20 OFFSET 0;
        """,
        "6. Company Summary Feed": """
            EXPLAIN ANALYZE
            SELECT c.id, c.raw_company_id, c.name, c.company_type, c.aggregate_rating, c.reviews_count, c.about, c.size, c.industry, c.is_newly_founded
            FROM companies c ORDER BY c.name ASC LIMIT 20 OFFSET 0;
        """,
        "7. Company Detail + Job Aggregation": f"""
            EXPLAIN ANALYZE
            SELECT c.id, c.raw_company_id, c.name, c.company_type, c.aggregate_rating, c.reviews_count, c.about, c.size, c.industry, c.is_newly_founded,
                   (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id) AS active_job_count
            FROM companies c WHERE c.id = '{sample_comp_id}';
        """
    }

    db_timings = {}
    for name, q in queries.items():
        t0 = time.perf_counter()
        cur.execute(q)
        plan = cur.fetchall()
        wall_ms = (time.perf_counter() - t0) * 1000
        exec_lines = [line[0] for line in plan if "Execution Time" in line[0]]
        pg_time_str = exec_lines[0] if exec_lines else "N/A"
        db_timings[name] = {"wall_ms": wall_ms, "pg_str": pg_time_str}
        print(f" {name}: Total DB Wall-clock = {wall_ms:.2f} ms | {pg_time_str}")

    cur.close()
    conn.close()

    # -------------------------------------------------------------------------
    # PART 3: API-LEVEL REQUEST/RESPONSE LATENCY BENCHMARKS
    # -------------------------------------------------------------------------
    print("\n--- PART 3: API-LEVEL REQUEST/RESPONSE LATENCY ---")

    client = TestClient(app)

    # First fetch valid IDs directly via API
    list_job_res = client.get("/api/v1/jobs?page_size=1")
    assert list_job_res.status_code == 200
    valid_api_job_id = list_job_res.json()[0]["job_id"]

    list_comp_res = client.get("/api/v1/companies?page_size=1")
    assert list_comp_res.status_code == 200
    valid_api_comp_id = list_comp_res.json()[0]["company_id"]

    api_endpoints = {
        "1. GET /api/v1/jobs (Default Feed)": "/api/v1/jobs?page=1&page_size=20",
        "2. GET /api/v1/jobs/{job_id} (Job Detail)": f"/api/v1/jobs/{valid_api_job_id}",
        "3. GET /api/v1/jobs?location=Bengaluru": "/api/v1/jobs?location=Bengaluru&page_size=20",
        "4. GET /api/v1/jobs?salary_min=300000": "/api/v1/jobs?salary_min=300000&page_size=20",
        "5. GET /api/v1/jobs?skills=Python,SQL": "/api/v1/jobs?skills=Python,SQL&page_size=20",
        "6. GET /api/v1/companies (Company Feed)": "/api/v1/companies?page=1&page_size=20",
        "7. GET /api/v1/companies/{company_id}": f"/api/v1/companies/{valid_api_comp_id}"
    }

    api_timings = {}
    for name, endpoint in api_endpoints.items():
        t0 = time.perf_counter()
        res = client.get(endpoint)
        api_ms = (time.perf_counter() - t0) * 1000
        assert res.status_code == 200, f"Endpoint {endpoint} failed with status {res.status_code}"
        api_timings[name] = api_ms
        print(f" {name}: Status {res.status_code} | API Response Time = {api_ms:.2f} ms")

    print("\n==================================================")
    print("QA & PERFORMANCE VALIDATION COMPLETED SUCCESSFULLY")
    print("==================================================")

    return {
        "counts": counts,
        "db_timings": db_timings,
        "api_timings": api_timings
    }


if __name__ == "__main__":
    run_qa_and_performance_validation()
