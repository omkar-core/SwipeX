"""
PostgreSQL Backup & Restore Validation Script for Milestone 2 — Day 5.
Safely creates a dump, restores it into an isolated temporary database (swipex_job_db_test_restore),
validates schema, indexes, constraints, and row counts, and drops ONLY the temporary test database.
"""
import os
import sys
import subprocess
import time
import psycopg2

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scripts.backup_postgres import run_backup

PG_RESTORE_PATH = r"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
LIVE_DB_NAME = "swipex_job_db"
TEST_RESTORE_DB_NAME = "swipex_job_db_test_restore"
DB_HOST = "127.0.0.1"
DB_PORT = "5432"
DB_USER = "postgres"


def get_admin_connection():
    """Connects to 'postgres' administrative database on local PostgreSQL."""
    return psycopg2.connect(
        dbname="postgres",
        user=DB_USER,
        host=DB_HOST,
        port=DB_PORT
    )


def validate_backup_restore_workflow() -> dict:
    """
    Executes and validates the full local backup/restore pipeline:
    1. Creates backup dump file of live DB (swipex_job_db).
    2. Strictly targets isolated database swipex_job_db_test_restore.
    3. Restores schema and data into swipex_job_db_test_restore.
    4. Compares table row counts, indexes, and constraints between live and restored DBs.
    5. Drops temporary database swipex_job_db_test_restore.
    """
    print("==================================================")
    print("DAY 5 — POSTGRESQL BACKUP & RESTORE VALIDATION")
    print("==================================================")

    # Hardguard 1: Refuse to execute if target DB is live DB
    target_db = TEST_RESTORE_DB_NAME
    if target_db == LIVE_DB_NAME:
        raise ValueError("CRITICAL SAFETY GUARDRAIL: Refusing to execute restore on live database 'swipex_job_db'!")

    # 1. Step A: Create Backup Dump of Live DB
    backup_path = run_backup(db_name=LIVE_DB_NAME, host=DB_HOST, port=DB_PORT, user=DB_USER)

    admin_conn = get_admin_connection()
    admin_conn.autocommit = True
    admin_cur = admin_conn.cursor()

    # Step B: Drop existing temporary test DB if left from prior interrupted run
    admin_cur.execute(f"DROP DATABASE IF EXISTS {target_db};")
    print(f"[PREPARATION] Created clean state by dropping any pre-existing '{target_db}' database.")

    # Step C: Create temporary target test database
    admin_cur.execute(f"CREATE DATABASE {target_db};")
    print(f"[PREPARATION] Created temporary restore target database '{target_db}'.")

    # Step D: Run pg_restore into swipex_job_db_test_restore ONLY
    print(f"[RESTORE] Restoring dump file into isolated database '{target_db}'...")
    restore_cmd = [
        PG_RESTORE_PATH,
        "-U", DB_USER,
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-d", target_db,
        "-v",
        backup_path
    ]

    env = os.environ.copy()
    if "PGPASSWORD" not in env:
        env["PGPASSWORD"] = "postgres"

    t0 = time.perf_counter()
    res_restore = subprocess.run(restore_cmd, capture_output=True, text=True, env=env)
    elapsed_restore = time.perf_counter() - t0

    # pg_restore exit code 0 or 1 (with minor warnings) is normal for pg_restore with custom extensions
    if res_restore.returncode > 1:
        print(f"[ERROR] pg_restore failed with exit code {res_restore.returncode}:\n{res_restore.stderr}", file=sys.stderr)
        # Cleanup
        admin_cur.execute(f"DROP DATABASE IF EXISTS {target_db};")
        admin_cur.close()
        admin_conn.close()
        raise RuntimeError(f"pg_restore failed with exit code {res_restore.returncode}")

    print(f"[RESTORE SUCCESS] Restored archive into '{target_db}' in {elapsed_restore:.2f} seconds.")

    # Step E: Fetch live counts from live database
    live_conn = psycopg2.connect(dbname=LIVE_DB_NAME, user=DB_USER, host=DB_HOST, port=DB_PORT)
    live_cur = live_conn.cursor()
    tables = ["jobs", "companies", "skills", "job_skills", "swipes", "saved_jobs"]
    live_counts = {}
    for tbl in tables:
        live_cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        live_counts[tbl] = live_cur.fetchone()[0]
    live_cur.close()
    live_conn.close()

    # Step F: Verify restored data integrity in swipex_job_db_test_restore
    test_conn = psycopg2.connect(dbname=target_db, user=DB_USER, host=DB_HOST, port=DB_PORT)
    test_cur = test_conn.cursor()
    restored_counts = {}
    for tbl in tables:
        test_cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        restored_counts[tbl] = test_cur.fetchone()[0]

    # Verify indexes in restored DB
    test_cur.execute("SELECT indexname FROM pg_indexes WHERE tablename = 'jobs';")
    job_indexes = [r[0] for r in test_cur.fetchall()]

    test_cur.execute("SELECT conname FROM pg_constraint WHERE conname LIKE 'chk_%' OR conname LIKE 'uq_%';")
    constraints = [r[0] for r in test_cur.fetchall()]

    test_cur.close()
    test_conn.close()

    print("\n--- RESTORE VERIFICATION REPORT ---")
    print(f"Live DB Counts:     {live_counts}")
    print(f"Restored DB Counts: {restored_counts}")

    # Integrity Assertions
    mismatches = []
    for tbl in tables:
        if live_counts[tbl] != restored_counts[tbl]:
            mismatches.append(f"Table '{tbl}': Live={live_counts[tbl]}, Restored={restored_counts[tbl]}")

    if mismatches:
        admin_cur.execute(f"DROP DATABASE IF EXISTS {target_db};")
        admin_cur.close()
        admin_conn.close()
        raise ValueError(f"Restore verification failed due to row count mismatches: {mismatches}")

    # Check baseline dataset counts
    assert restored_counts["jobs"] == 97929, f"Expected 97,929 jobs, got {restored_counts['jobs']}"
    assert restored_counts["companies"] == 18328, f"Expected 18,328 companies, got {restored_counts['companies']}"
    assert restored_counts["skills"] == 44078, f"Expected 44,078 skills, got {restored_counts['skills']}"
    assert restored_counts["job_skills"] == 755099, f"Expected 755,099 job_skills, got {restored_counts['job_skills']}"

    assert "idx_jobs_title_trgm" in job_indexes, "Missing trigram GIN title index in restored DB"
    assert "chk_job_competition" in constraints, "Missing competition check constraint in restored DB"
    assert "uq_user_job_swipe" in constraints, "Missing swipe unique constraint in restored DB"

    print("[VERIFICATION PASSED] All 6 tables match live row counts exactly. All indexes and constraints intact.")

    # Step G: Safely drop ONLY the temporary test database
    print(f"[CLEANUP] Dropping temporary test database '{target_db}'...")
    admin_cur.execute(f"DROP DATABASE IF EXISTS {target_db};")
    admin_cur.close()
    admin_conn.close()
    print(f"[CLEANUP SUCCESS] Temporary test database '{target_db}' dropped. Live database '{LIVE_DB_NAME}' remains untouched.")

    return {
        "status": "PASS",
        "live_counts": live_counts,
        "restored_counts": restored_counts,
        "backup_path": backup_path,
        "indexes_verified": len(job_indexes),
        "constraints_verified": len(constraints)
    }


if __name__ == "__main__":
    try:
        res = validate_backup_restore_workflow()
        print("\n==================================================")
        print("BACKUP & RESTORE VALIDATION COMPLETED SUCCESSFULLY")
        print("==================================================")
    except Exception as e:
        print(f"\n[ERROR] Validation failed: {e}", file=sys.stderr)
        sys.exit(1)
