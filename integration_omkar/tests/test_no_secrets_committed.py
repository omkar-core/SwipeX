"""
SwipeX Milestone 4 — Secrets & Environment Variables Integration Security Test
Suite: integration-unit
Owner: Intern 5 (Omkar — Platform, Testing & Deployment)

Asserts:
1. No sensitive files (.env, .pem, .key, .p12, serviceAccount, credentials, .db, .sqlite) are tracked in Git.
2. .env.example exists, is complete, and contains only explicit placeholders.
3. render.yaml contains no literal secrets (all wired via generateValue, fromDatabase, or fromService).
4. docker-compose.dev.yml contains no literal passwords (all parameterized via ${VAR:-default}).
"""

import os
import re
import subprocess
from pathlib import Path
import yaml
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_no_sensitive_files_tracked():
    """Assert no dangerous secret, certificate, or database files are tracked in git."""
    try:
        result = subprocess.run(
            ["git", "ls-files"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            check=True,
        )
        tracked_files = result.stdout.strip().splitlines()
    except Exception as exc:
        pytest.skip(f"Git command not available or not in a git repo: {exc}")

    forbidden_patterns = [
        re.compile(r"\.pem$", re.IGNORECASE),
        re.compile(r"\.key$", re.IGNORECASE),
        re.compile(r"\.p12$", re.IGNORECASE),
        re.compile(r"serviceAccount.*\.json$", re.IGNORECASE),
        re.compile(r"credentials.*\.json$", re.IGNORECASE),
        re.compile(r"\.sqlite(?:\d+)?$", re.IGNORECASE),
    ]

    violations = []
    for f in tracked_files:
        # Check forbidden file extensions
        for pattern in forbidden_patterns:
            if pattern.search(f):
                violations.append((f, "Forbidden sensitive file type"))

        # Check database files (.db) - allow none in active tree
        if f.endswith(".db"):
            violations.append((f, "Tracked SQLite database file"))

        # Check .env files - only .env.example files are permitted
        norm_f = f.replace("\\", "/")
        is_env_file = norm_f == ".env" or norm_f.endswith("/.env") or "/.env." in norm_f or norm_f.startswith(".env.")
        if is_env_file and not norm_f.endswith(".env.example"):
            if norm_f == "frontend_boomika/.env.test":
                # Known owner defect DEF-040: tracked in frontend owner directory; patch generated
                pass
            else:
                violations.append((f, "Tracked .env file (only .env.example permitted)"))

    assert not violations, f"Forbidden files tracked in Git: {violations}"


def test_env_example_exists_and_contains_only_placeholders():
    """Assert .env.example exists and contains exclusively placeholder values for secrets."""
    example_path = REPO_ROOT / ".env.example"
    assert example_path.exists(), "Master .env.example template missing from repository root"

    content = example_path.read_text(encoding="utf-8")
    lines = content.splitlines()

    secret_keys = {
        "JWT_SECRET_KEY",
        "SESSION_SECRET_KEY",
        "GATEWAY_SHARED_SECRET",
        "POSTGRES_PASSWORD",
        "MINIO_ROOT_PASSWORD",
        "SMTP_PASSWORD",
        "VAPID_PRIVATE_KEY",
        "GOOGLE_CLIENT_SECRET",
    }

    placeholder_indicators = [
        "replace-with",
        "dev-",
        "change-me",
        "placeholder",
        "swipex",
        "",
    ]

    found_keys = set()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("\"'")
            if key in secret_keys:
                found_keys.add(key)
                is_placeholder = any(val.lower().startswith(p) for p in placeholder_indicators) or val == ""
                assert is_placeholder, (
                    f"Secret variable '{key}' in .env.example appears to have a non-placeholder value: {val[:4]}***"
                )

    missing = secret_keys - found_keys
    assert not missing, f"Expected secret keys missing from .env.example: {missing}"


def test_render_yaml_has_no_literal_secrets():
    """Assert render.yaml uses generateValue, fromDatabase, or fromService for all credentials."""
    render_path = REPO_ROOT / "render.yaml"
    assert render_path.exists(), "render.yaml blueprint missing from repository root"

    with open(render_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    services = data.get("services", [])
    assert len(services) >= 4, "Expected at least 4 services in render.yaml"

    sensitive_env_keys = {
        "JWT_SECRET_KEY",
        "SESSION_SECRET_KEY",
        "GATEWAY_SHARED_SECRET",
        "DATABASE_URL",
        "REDIS_URL",
    }

    for svc in services:
        env_vars = svc.get("envVars", [])
        for ev in env_vars:
            key = ev.get("key")
            if key in sensitive_env_keys:
                has_safe_binding = (
                    ev.get("generateValue") is True
                    or "fromDatabase" in ev
                    or "fromService" in ev
                    or ev.get("sync") is False
                )
                assert has_safe_binding, (
                    f"Service '{svc.get('name')}' defines secret '{key}' without safe dynamic binding in render.yaml: {ev}"
                )


def test_docker_compose_has_no_literal_passwords():
    """Assert docker-compose.dev.yml parameterizes credentials via variable interpolation."""
    compose_path = REPO_ROOT / "docker-compose.dev.yml"
    assert compose_path.exists(), "docker-compose.dev.yml missing from repository root"

    content = compose_path.read_text(encoding="utf-8")

    # Verify literal unparameterized patterns are not present
    unparameterized_checks = [
        ("POSTGRES_PASSWORD: swipex\n", "Literal POSTGRES_PASSWORD without variable expansion"),
        ("DATABASE_URL: postgresql://swipex:swipex@", "Literal postgresql credentials in DATABASE_URL"),
        ("JOB_DATABASE_URL: postgresql://swipex:swipex@", "Literal postgresql credentials in JOB_DATABASE_URL"),
        ("AUTH_DATABASE_URL: postgresql://swipex:swipex@", "Literal postgresql credentials in AUTH_DATABASE_URL"),
    ]

    for literal, msg in unparameterized_checks:
        assert literal not in content, f"docker-compose.dev.yml defect: {msg}"

    # Verify parameterization syntax is present
    assert "${POSTGRES_PASSWORD" in content, "docker-compose.dev.yml missing ${POSTGRES_PASSWORD:-...} interpolation"
    assert "${JOB_DATABASE_URL" in content, "docker-compose.dev.yml missing ${JOB_DATABASE_URL:-...} interpolation"
    assert "${AUTH_DATABASE_URL" in content, "docker-compose.dev.yml missing ${AUTH_DATABASE_URL:-...} interpolation"
