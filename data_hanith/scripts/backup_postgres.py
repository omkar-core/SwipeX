"""
PostgreSQL Database Backup Tool for SwipeX Job & Data Intelligence Service.
Executes non-destructive pg_dump in custom archive format (-F c) with safety checks.
"""
import os
import sys
import subprocess
import time
from datetime import datetime

# Path to PostgreSQL 18 binaries
PG_DUMP_PATH = r"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
PG_RESTORE_PATH = r"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
DEFAULT_BACKUP_DIR = r"D:\Workspace\data\backups"


def run_backup(
    db_name: str = "swipex_job_db",
    host: str = "127.0.0.1",
    port: str = "5432",
    user: str = "postgres",
    output_dir: str = DEFAULT_BACKUP_DIR,
    filename: str = None
) -> str:
    """
    Creates a compressed custom-format pg_dump backup of the target PostgreSQL database.
    Includes safety checks:
    - Creates output directory if needed.
    - Avoids silent overwrites by default or handles timestamped naming.
    - Validates exit codes, non-zero file sizes, and header contents via pg_restore --list.
    """
    if not os.path.exists(PG_DUMP_PATH):
        raise FileNotFoundError(f"pg_dump executable not found at '{PG_DUMP_PATH}'")

    os.makedirs(output_dir, exist_ok=True)

    if not filename:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{db_name}_{ts}.dump"

    target_filepath = os.path.join(output_dir, filename)

    if os.path.exists(target_filepath):
        print(f"[BACKUP NOTICE] Target backup file '{target_filepath}' already exists. Appending unique suffix.")
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        target_filepath = os.path.join(output_dir, f"{db_name}_{ts}.dump")

    print(f"=== Starting PostgreSQL Backup ===")
    print(f"Source DB: {db_name} ({host}:{port})")
    print(f"Destination File: {target_filepath}")

    cmd = [
        PG_DUMP_PATH,
        "-U", user,
        "-h", host,
        "-p", port,
        "-F", "c",  # Custom format
        "-b",       # Include large objects
        "-v",       # Verbose output
        "-f", target_filepath,
        db_name
    ]

    env = os.environ.copy()
    # PGPASSWORD can be set if needed
    if "PGPASSWORD" not in env:
        env["PGPASSWORD"] = "postgres"

    t0 = time.perf_counter()
    res = subprocess.run(cmd, capture_output=True, text=True, env=env)
    elapsed = time.perf_counter() - t0

    if res.returncode != 0:
        err_msg = res.stderr or res.stdout
        raise RuntimeError(f"pg_dump failed with exit code {res.returncode}:\n{err_msg}")

    # Safety Check 1: File existence and non-zero size
    if not os.path.exists(target_filepath):
        raise FileNotFoundError(f"Backup file was not created: '{target_filepath}'")

    file_size_bytes = os.path.getsize(target_filepath)
    if file_size_bytes == 0:
        raise ValueError(f"Backup file is empty (0 bytes): '{target_filepath}'")

    file_size_mb = file_size_bytes / (1024.0 * 1024.0)
    print(f"[BACKUP SUCCESS] Created dump archive: {file_size_mb:.2f} MB in {elapsed:.2f} seconds")

    # Safety Check 2: Run pg_restore --list to verify header archive integrity
    if os.path.exists(PG_RESTORE_PATH):
        list_cmd = [PG_RESTORE_PATH, "--list", target_filepath]
        list_res = subprocess.run(list_cmd, capture_output=True, text=True, env=env)
        if list_res.returncode != 0:
            raise RuntimeError(f"Backup archive integrity check failed (pg_restore --list returned exit code {list_res.returncode}):\n{list_res.stderr}")

        toc_lines = len(list_res.stdout.splitlines())
        print(f"[VERIFICATION] pg_restore --list verified valid custom archive containing {toc_lines} table/object entries.")

    return target_filepath


if __name__ == "__main__":
    try:
        path = run_backup()
        print(f"Backup complete: {path}")
    except Exception as e:
        print(f"Backup FAILED: {e}", file=sys.stderr)
        sys.exit(1)
