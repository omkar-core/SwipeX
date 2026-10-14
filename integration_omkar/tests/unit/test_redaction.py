"""
test_redaction.py - Unit Tests for Credential & Password Redaction
Owned by Intern 5 (Platform, Testing & Deployment).

Validates:
1. Standard user:password masking in connection URLs (PostgreSQL, MySQL, Redis, etc.).
2. URLs with passwords in query strings (?password=..., &password=...).
3. Passwords containing special characters (!, $, &, *, +, %, #, -, _, =, ^).
4. URLs and connection strings inside exception messages and formatted tracebacks.
5. Literal environment passwords extracted from DATABASE_URL / JOB_DATABASE_URL / REDIS_URL.
6. Automatic redaction via logging.Filter on root logger and handlers.
7. Automatic interception via RedactingStream wrapper on sys.stdout and sys.stderr.
8. Preservation of non-sensitive URLs (sqlite:///, public HTTP/HTTPS URLs without credentials).
"""
import io
import logging
import traceback

from integration_omkar.deploy.redact import (
    redact_url,
    redact_text,
    extract_env_passwords,
    RedactionFilter,
    RedactingStream,
)


def test_redact_url_standard_password():
    raw = "postgresql://swipex_user:my_secret_pass123@db.render.internal:5432/swipex_auth"
    expected = "postgresql://swipex_user:***@db.render.internal:5432/swipex_auth"
    assert redact_url(raw) == expected
    assert "my_secret_pass123" not in redact_url(raw)


def test_redact_url_no_username_redis():
    raw = "redis://:redis_secret_token@redis-service:6379/0"
    expected = "redis://:***@redis-service:6379/0"
    assert redact_url(raw) == expected
    assert "redis_secret_token" not in redact_url(raw)


def test_redact_url_query_string():
    raw = "postgresql://db.example.com:5432/swipex?password=query_secret_pass&sslmode=require"
    result = redact_url(raw)
    assert "query_secret_pass" not in result
    assert "password=***" in result
    assert "sslmode=require" in result


def test_redact_url_multiple_query_variants():
    variants = [
        ("postgres://host/db?pwd=my_pwd_123", "pwd=***"),
        ("postgres://host/db?pass=my_pass_456", "pass=***"),
        ("postgres://host/db?secret=my_secret_789", "secret=***"),
        ("postgres://host/db?auth=token&password=my_pwd", "password=***"),
    ]
    for raw, expected_token in variants:
        res = redact_url(raw)
        assert expected_token in res


def test_redact_url_special_characters():
    specials = [
        "p@ssword!123",
        "P@ss-w0rd_$%^&*()+=",
        "complex#pass:val",
        "user%40domain:p%40ssw0rd@host:5432/db",
    ]
    for pwd in specials:
        raw = f"postgresql://app_user:{pwd}@pg-host.example.com:5432/mydb"
        res = redact_url(raw)
        assert "@pg-host.example.com:5432/mydb" in res
        assert pwd not in res
        assert ":***@" in res


def test_redact_url_inside_exception_message():
    try:
        raise ConnectionError(
            "FATAL: password authentication failed for connection to "
            "postgresql://swipex_adm:SENTINEL_EXC_PW_99@db.render.com:5432/swipex"
        )
    except Exception as exc:
        exc_str = str(exc)
        tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))

        redacted_msg = redact_text(exc_str)
        redacted_tb = redact_text(tb_str)

        assert "SENTINEL_EXC_PW_99" not in redacted_msg
        assert "postgresql://swipex_adm:***@db.render.com:5432/swipex" in redacted_msg
        assert "SENTINEL_EXC_PW_99" not in redacted_tb


def test_redact_text_literal_env_passwords(monkeypatch):
    sentinel = "SENTINEL_LITERAL_SECRET_XYZ_42"
    monkeypatch.setenv("DATABASE_URL", f"postgresql://swipex:{sentinel}@host:5432/db")

    pwds = extract_env_passwords()
    assert sentinel in pwds

    # Appears inside raw log without standard URL prefix
    plain_log = f"Failed attempting authentication using password {sentinel} for user swipex"
    redacted = redact_text(plain_log, pwds)
    assert sentinel not in redacted
    assert "***" in redacted


def test_logging_filter_redaction():
    sentinel = "LOG_SECRET_PW_98765"
    test_logger = logging.getLogger("test_redact_logger")
    test_logger.setLevel(logging.INFO)

    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))

    # Add filter
    rf = RedactionFilter(extra_passwords={sentinel})
    handler.addFilter(rf)
    test_logger.addHandler(handler)

    try:
        test_logger.info(f"Connecting to postgresql://user:{sentinel}@db:5432/auth")
        test_logger.warning("Literal secret leak attempt: %s", sentinel)

        out = stream.getvalue()
        assert sentinel not in out
        assert "postgresql://user:***@db:5432/auth" in out
        assert "Literal secret leak attempt: ***" in out
    finally:
        test_logger.removeHandler(handler)


def test_redacting_stream_wrapper():
    sentinel = "STREAM_RAW_SECRET_112233"
    target = io.StringIO()
    wrapped = RedactingStream(target, extra_passwords={sentinel})

    wrapped.write(f"Applying Milestone 4 migration to postgresql://user:{sentinel}@db/main\n")
    wrapped.write(f"Raw password dump: {sentinel}\n")
    wrapped.flush()

    out = target.getvalue()
    assert sentinel not in out
    assert "postgresql://user:***@db/main" in out
    assert "Raw password dump: ***" in out


def test_redact_url_preserves_safe_strings():
    assert redact_url("sqlite:///./local.db") == "sqlite:///./local.db"
    assert redact_url("https://swipex-bpgb.onrender.com/health") == "https://swipex-bpgb.onrender.com/health"
    assert redact_url("http://localhost:8000/api/v1/jobs") == "http://localhost:8000/api/v1/jobs"
    assert redact_url("") == ""
    assert redact_url(None) == ""
