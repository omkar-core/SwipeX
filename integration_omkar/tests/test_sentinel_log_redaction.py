"""
test_sentinel_log_redaction.py - Live & Subprocess Sentinel Credential Redaction Verification
Owned by Intern 5 (Platform, Testing & Deployment).

Ensures that under full migration and server startup with a distinctive sentinel password
(e.g., SENTINEL_PW_12345), all logs, stdout, stderr, and tracebacks strictly redact the password
and output it 0 times.

Includes:
1. Subprocess entrypoint migration startup test with distinct sentinel password.
2. Subprocess migrate_and_seed coordinator test with distinct sentinel password.
3. Containerized Docker log test (skipped when Docker Desktop is not running).
"""
import os
import sys
import shutil
import subprocess
import pytest

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SENTINEL_PASSWORD = "SENTINEL_PW_12345"


def is_docker_available() -> bool:
    """Check if the Docker CLI is present and the Docker daemon is responding."""
    if not shutil.which("docker"):
        return False
    try:
        res = subprocess.run(
            ["docker", "info"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=3,
        )
        return res.returncode == 0
    except Exception:
        return False


def test_entrypoint_redaction_subprocess(tmp_path):
    """
    Spawns entrypoint_render.py in a fresh subprocess with SENTINEL_PASSWORD
    embedded inside DATABASE_URL. Captures all stdout and stderr.
    Verifies that the sentinel password appears exactly 0 times in all emitted logs.
    """
    env = os.environ.copy()
    env["DATABASE_URL"] = f"postgresql://swipex_user:{SENTINEL_PASSWORD}@127.0.0.1:5432/swipex_auth"
    env["RUN_MIGRATION"] = "true"
    env["PORT"] = "19876"

    # Use short max wait to fail fast if DB is unreachable
    cmd = [
        sys.executable,
        os.path.join(BASE_DIR, "integration_omkar", "deploy", "entrypoint_render.py"),
        "--app", "backend_mansi.app.main:app",
    ]

    proc = subprocess.Popen(
        cmd,
        cwd=BASE_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        stdout, stderr = proc.communicate(timeout=6)
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = proc.communicate()

    combined_output = f"{stdout}\n{stderr}"

    assert SENTINEL_PASSWORD not in combined_output, (
        f"SECURITY BREACH: Sentinel password '{SENTINEL_PASSWORD}' leaked in entrypoint output!\n"
        f"Output excerpt:\n{combined_output[:1000]}"
    )
    # Check that redaction mask was applied if URL was logged
    if "postgresql://swipex_user" in combined_output:
        assert "postgresql://swipex_user:***@" in combined_output


def test_migrate_and_seed_subprocess():
    """
    Spawns migrate_and_seed.py with SENTINEL_PASSWORD embedded in the DB URLs.
    Verifies that the sentinel password appears 0 times in all logs.
    """
    env = os.environ.copy()
    sentinel_db_url = f"postgresql://swipex_migrator:{SENTINEL_PASSWORD}@127.0.0.1:5432/swipex_db"
    env["DATABASE_URL"] = sentinel_db_url
    env["JOB_DATABASE_URL"] = sentinel_db_url

    cmd = [
        sys.executable,
        os.path.join(BASE_DIR, "integration_omkar", "deploy", "migrate_and_seed.py"),
    ]

    proc = subprocess.Popen(
        cmd,
        cwd=BASE_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        stdout, stderr = proc.communicate(timeout=6)
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = proc.communicate()

    combined_output = f"{stdout}\n{stderr}"

    assert SENTINEL_PASSWORD not in combined_output, (
        f"SECURITY BREACH: Sentinel password '{SENTINEL_PASSWORD}' leaked in migrate_and_seed output!\n"
        f"Output excerpt:\n{combined_output[:1000]}"
    )
    if "postgresql://swipex_migrator" in combined_output:
        assert "postgresql://swipex_migrator:***@" in combined_output


def test_docker_sentinel_log_redaction():
    """
    Runs entrypoint inside a live Docker container if Docker is available.
    Skipped with clear diagnostic message when Docker Desktop is not running.
    """
    if not is_docker_available():
        pytest.skip("Docker Desktop engine is not running - skipping live container sentinel password log test")

    container_name = "swipex-sentinel-test-container"
    # Ensure any previous container is cleaned up
    subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)

    sentinel_url = f"postgresql://swipex_user:{SENTINEL_PASSWORD}@host.docker.internal:5432/swipex_auth"

    run_cmd = [
        "docker", "run", "--rm",
        "--name", container_name,
        "-e", f"DATABASE_URL={sentinel_url}",
        "-e", "RUN_MIGRATION=true",
        "-e", "PORT=10000",
        "-e", "DB_WAIT_TIMEOUT_SECONDS=2",
        "-e", "DB_RETRY_INTERVAL_SECONDS=0.5",
        "-e", "DB_MAX_RETRIES=2",
        "-e", "DB_RETRY_DELAY=0.2",
        "-v", f"{BASE_DIR}:/app",
        "-w", "/app",
        "python:3.11.9-slim",
        "python", "integration_omkar/deploy/entrypoint_render.py",
        "--app", "backend_mansi.app.main:app",
    ]

    try:
        res = subprocess.run(run_cmd, capture_output=True, text=True, timeout=30)
        combined_logs = f"{res.stdout}\n{res.stderr}"
    except subprocess.TimeoutExpired:
        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)
        pytest.fail("Container timed out during sentinel log verification")

    assert SENTINEL_PASSWORD not in combined_logs, (
        f"SECURITY BREACH: Sentinel password found in Docker container logs!\n{combined_logs}"
    )
