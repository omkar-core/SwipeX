#!/usr/bin/env python3
"""
bootstrap_test_db.py - Deterministic Test SQLite Database Bootstrapper
Owned by Intern 5 (Platform, Testing & Deployment).

Initializes the local SQLite database at `data/swipex_job.db` using the owners'
own schema.sql and migration scripts (unmodified) so that CI and local test suites
have the required base tables (jobs, companies, skills, etc.) without committing any .db files.
"""
import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "data_hanith"))
sys.path.insert(0, os.path.join(BASE_DIR, "integration_omkar"))

def bootstrap_sqlite(db_file: str = None) -> str:
    from data_hanith.config import DATABASE_URL
    if db_file:
        target_path = os.path.abspath(db_file)
    elif DATABASE_URL.startswith("sqlite:///"):
        target_path = os.path.abspath(DATABASE_URL.replace("sqlite:///", ""))
    else:
        target_path = os.path.join(BASE_DIR, "data", "swipex_job.db")

    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    sqlite_url = f"sqlite:///{target_path}"
    print(f"[BOOTSTRAP] Bootstrapping test SQLite database at: {target_path}")

    # Use Hanith's own schema.sql and migration scripts unmodified via migrate_and_seed
    from integration_omkar.deploy.migrate_and_seed import run_migrations_and_seed
    run_migrations_and_seed(job_db_url=sqlite_url, auth_db_url=f"sqlite:///{os.path.join(os.path.dirname(target_path), 'swipex_auth_test.db')}")
    print(f"[BOOTSTRAP] Successfully initialized SQLite test database at {target_path}")
    return target_path

if __name__ == "__main__":
    db_target = sys.argv[1] if len(sys.argv) > 1 else None
    bootstrap_sqlite(db_target)
