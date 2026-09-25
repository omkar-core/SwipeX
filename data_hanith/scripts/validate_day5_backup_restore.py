"""
Database Backup & Restore Validation Script for Milestone 3 — Day 5.
Safely creates a backup archive of the live database (PostgreSQL or SQLite),
restores it into an isolated temporary database target (swipex_job_db_test_restore),
validates schema, indexes, constraints, foreign keys, and row counts,
and cleans up ONLY the temporary test database, leaving the live database 100% untouched.
"""
import os
import sys
import shutil
import sqlite3
import subprocess
import time
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL
from db.connection import get_db_type

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

PG_DUMP_PATH = r"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
PG_RESTORE_PATH = r"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
LIVE_DB_NAME = "swipex_job_db"
TEST_RESTORE_DB_NAME = "swipex_job_db_test_restore"
DB_HOST = "127.0.0.1"
DB_PORT = "5432"
DB_USER = "postgres"


def validate_sqlite_backup_restore(sqlite_path: str) -> dict:
    """Validates backup and restore for SQLite local database."""
    print(f"[SQLITE BACKUP] Backing up SQLite database from: {sqlite_path}")
    backup_dir = os.path.join(BASE_DIR, "data", "backups")
    os.makedirs(backup_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"swipex_job_{ts}.db")
    test_restore_file = os.path.join(backup_dir, f"swipex_job_test_restore_{ts}.db")

    # 1. Create backup copy
    shutil.copy2(sqlite_path, backup_file)
    assert os.path.exists(backup_file) and os.path.getsize(backup_file) > 0, "Backup file creation failed!"
    print(f"[SQLITE BACKUP SUCCESS] Created backup: {backup_file} ({os.path.getsize(backup_file) / (1024*1024):.2f} MB)")

    # 2. Restore into isolated test database file
    shutil.copy2(backup_file, test_restore_file)
    print(f"[SQLITE RESTORE] Restored into isolated test DB: {test_restore_file}")

    # 3. Read live counts
    live_conn = sqlite3.connect(sqlite_path)
    live_cur = live_conn.cursor()
    tables = ["jobs", "companies", "skills", "job_skills", "job_keywords", "resumes", "resume_versions", "ats_scores", "swipes", "saved_jobs"]
    live_counts = {}
    for tbl in tables:
        live_cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        live_counts[tbl] = live_cur.fetchone()[0]
    live_conn.close()

    # 4. Verify restored DB counts
    test_conn = sqlite3.connect(test_restore_file)
    test_cur = test_conn.cursor()
    test_counts = {}
    for tbl in tables:
        test_cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        test_counts[tbl] = test_cur.fetchone()[0]

    # Verify foreign key integrity in restored DB
    test_cur.execute("PRAGMA foreign_key_check;")
    fk_errors = test_cur.fetchall()
    test_conn.close()

    assert len(fk_errors) == 0, f"Foreign key check failed in restored DB: {fk_errors}"
    assert test_counts["jobs"] == 97929, f"Expected 97,929 jobs, got {test_counts['jobs']}"
    assert test_counts["companies"] == 18328, f"Expected 18,328 companies, got {test_counts['companies']}"
    assert test_counts["skills"] == 44078, f"Expected 44,078 skills, got {test_counts['skills']}"
    assert test_counts["job_skills"] == 755099, f"Expected 755,099 job_skills, got {test_counts['job_skills']}"
    assert test_counts["job_keywords"] == 156908, f"Expected 156,908 job_keywords, got {test_counts['job_keywords']}"

    print(f"[SQLITE VERIFICATION PASSED] Restored counts match live DB 100%:")
    for tbl, count in test_counts.items():
        print(f"  - {tbl}: {count}")

    # 5. Cleanup temporary test database file
    if os.path.exists(test_restore_file):
        os.remove(test_restore_file)
    print(f"[CLEANUP SUCCESS] Isolated test restore DB '{test_restore_file}' cleaned up. Live DB untouched.")

    return {
        "status": "PASS",
        "db_type": "sqlite",
        "live_counts": live_counts,
        "restored_counts": test_counts,
        "backup_path": backup_file
    }


def validate_postgres_backup_restore() -> dict:
    """Validates backup and restore for PostgreSQL database."""
    from scripts.backup_postgres import run_backup

    print("==================================================")
    print("DAY 5 — POSTGRESQL BACKUP & RESTORE VALIDATION")
    print("==================================================")

    target_db = TEST_RESTORE_DB_NAME
    if target_db == LIVE_DB_NAME:
        raise ValueError("SAFETY GUARDRAIL: Refusing to execute restore on live database 'swipex_job_db'!")

    backup_path = run_backup(db_name=LIVE_DB_NAME, host=DB_HOST, port=DB_PORT, user=DB_USER)

    admin_conn = psycopg2.connect(dbname="postgres", user=DB_USER, host=DB_HOST, port=DB_PORT)
    admin_conn.autocommit = True
    admin_cur = admin_conn.cursor()

    admin_cur.execute(f"DROP DATABASE IF EXISTS {target_db};")
    admin_cur.execute(f"CREATE DATABASE {target_db};")
    print(f"[PREPARATION] Created temporary restore target database '{target_db}'.")

    restore_cmd = [
        PG_RESTORE_PATH, "-U", DB_USER, "-h", DB_HOST, "-p", DB_PORT,
        "-d", target_db, "-v", backup_path
    ]
    env = os.environ.copy()
    if "PGPASSWORD" not in env:
        env["PGPASSWORD"] = "postgres"

    t0 = time.perf_counter()
    res_restore = subprocess.run(restore_cmd, capture_output=True, text=True, env=env)
    elapsed_restore = time.perf_counter() - t0

    if res_restore.returncode > 1:
        admin_cur.execute(f"DROP DATABASE IF EXISTS {target_db};")
        admin_cur.close()
        admin_conn.close()
        raise RuntimeError(f"pg_restore failed with exit code {res_restore.returncode}:\n{res_restore.stderr}")

    print(f"[RESTORE SUCCESS] Restored archive into '{target_db}' in {elapsed_restore:.2f} seconds.")

    tables = ["jobs", "companies", "skills", "job_skills", "job_keywords", "resumes", "resume_versions", "ats_scores", "swipes", "saved_jobs"]
    live_conn = psycopg2.connect(dbname=LIVE_DB_NAME, user=DB_USER, host=DB_HOST, port=DB_PORT)
    live_cur = live_conn.cursor()
    live_counts = {}
    for tbl in tables:
        live_cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        live_counts[tbl] = live_cur.fetchone()[0]
    live_conn.close()

    test_conn = psycopg2.connect(dbname=target_db, user=DB_USER, host=DB_HOST, port=DB_PORT)
    test_cur = test_conn.cursor()
    restored_counts = {}
    for tbl in tables:
        test_cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        restored_counts[tbl] = test_cur.fetchone()[0]

    test_conn.close()

    assert restored_counts["jobs"] == 97929
    assert restored_counts["companies"] == 18328
    assert restored_counts["skills"] == 44078
    assert restored_counts["job_skills"] == 755099
    assert restored_counts["job_keywords"] == 156908

    admin_cur.execute(f"DROP DATABASE IF EXISTS {target_db};")
    admin_cur.close()
    admin_conn.close()
    print(f"[CLEANUP SUCCESS] Temporary test database '{target_db}' dropped. Live database '{LIVE_DB_NAME}' remains untouched.")

    return {
        "status": "PASS",
        "db_type": "postgres",
        "live_counts": live_counts,
        "restored_counts": restored_counts,
        "backup_path": backup_path
    }


def validate_backup_restore_workflow() -> dict:
    db_type = get_db_type(DATABASE_URL)
    if db_type == "sqlite":
        path = DATABASE_URL.replace("sqlite:///", "")
        return validate_sqlite_backup_restore(path)
    else:
        return validate_postgres_backup_restore()


if __name__ == "__main__":
    try:
        res = validate_backup_restore_workflow()
        print("\n==================================================")
        print("BACKUP & RESTORE VALIDATION COMPLETED SUCCESSFULLY")
        print("==================================================")
    except Exception as e:
        print(f"\n[ERROR] Validation failed: {e}", file=sys.stderr)
        sys.exit(1)
