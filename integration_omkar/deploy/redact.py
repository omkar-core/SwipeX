"""
redact.py - Credential & URL Redaction Helper and Logging Filter
Owned by Intern 5 (Platform, Testing & Deployment).

Provides:
1. redact_url(url: str) -> str:
   Masks passwords in scheme://user:pass@host and query-string parameters.
2. extract_env_passwords() -> set[str]:
   Extracts literal passwords from DATABASE_URL, JOB_DATABASE_URL, AUTH_DATABASE_URL, REDIS_URL.
3. redact_text(text: str, extra_passwords: set = None) -> str:
   Redacts URLs, query string passwords, and literal environment passwords.
4. RedactionFilter(logging.Filter):
   Filter applied to loggers and handlers to redact LogRecord msg and args.
5. RedactingStream:
   Wrapper around sys.stdout / sys.stderr that redacts stream writes.
6. install_redaction_layer():
   Installs redaction filter on root logger + all handlers and wraps sys.stdout and sys.stderr.
"""
import os
import re
import sys
import logging
from typing import Set, Optional

# Match authority with password: scheme://[user]:[password]@host
URL_CREDENTIAL_PATTERN = re.compile(
    r'([a-zA-Z][a-zA-Z0-9+.-]*://[^:\s/]*):([^@\s/]+)@'
)

# Match query-string password parameters: ?password=... or &password=...
QUERY_PASSWORD_PATTERN = re.compile(
    r'([?&](?:password|pwd|pass|secret)=)[^&#\s]+',
    re.IGNORECASE
)


def extract_env_passwords() -> Set[str]:
    """
    Extract literal passwords from known credential environment variables.
    Only extracts passwords of length >= 3 to avoid accidental over-redaction.
    """
    passwords: Set[str] = set()
    env_keys = (
        "DATABASE_URL",
        "JOB_DATABASE_URL",
        "AUTH_DATABASE_URL",
        "REDIS_URL",
        "POSTGRES_PASSWORD",
        "DB_PASSWORD",
    )
    for key in env_keys:
        val = os.environ.get(key, "")
        if not val:
            continue
        # Check scheme://user:pass@host
        m = URL_CREDENTIAL_PATTERN.search(val)
        if m:
            pwd = m.group(2)
            if len(pwd) >= 3 and pwd != "***":
                passwords.add(pwd)
        # Check query string passwords
        for qm in QUERY_PASSWORD_PATTERN.finditer(val):
            pwd = qm.group(0).split("=", 1)[1]
            if len(pwd) >= 3 and pwd != "***":
                passwords.add(pwd)
        # If the env var itself is a raw password
        if key in ("POSTGRES_PASSWORD", "DB_PASSWORD") and len(val) >= 3 and val != "***":
            passwords.add(val)
    return passwords


def redact_url(url: Optional[str]) -> str:
    """
    Masks credentials inside connection URLs and query parameters.
    e.g. postgresql://user:secret@host:5432/db -> postgresql://user:***@host:5432/db
    e.g. redis://:mypassword@host:6379/0 -> redis://:***@host:6379/0
    e.g. postgresql://host/db?password=secret -> postgresql://host/db?password=***
    """
    if not url or not isinstance(url, str):
        return "" if url is None else str(url)

    # 1. Mask scheme://user:pass@host
    redacted = URL_CREDENTIAL_PATTERN.sub(r'\1:***@', url)

    # 2. Mask query string passwords
    redacted = QUERY_PASSWORD_PATTERN.sub(r'\g<1>***', redacted)

    return redacted


def redact_text(text: str, extra_passwords: Optional[Set[str]] = None) -> str:
    """
    Applies URL redaction, query string password redaction, and masks any literal
    environment passwords found anywhere in the text (including tracebacks).
    """
    if not isinstance(text, str):
        return text

    # Apply URL & query redaction
    result = redact_url(text)

    # Apply literal passwords redaction
    pwds = extra_passwords if extra_passwords is not None else extract_env_passwords()
    if pwds:
        # Replace longer passwords first to avoid partial replacements
        for pwd in sorted(pwds, key=len, reverse=True):
            if pwd and pwd != "***" and len(pwd) >= 3:
                result = result.replace(pwd, "***")

    return result


class RedactionFilter(logging.Filter):
    """
    Logging filter that redacts credentials from log records before formatting/emission.
    """
    def __init__(self, name: str = "", extra_passwords: Optional[Set[str]] = None):
        super().__init__(name)
        self.extra_passwords = extra_passwords

    def filter(self, record: logging.LogRecord) -> bool:
        pwds = self.extra_passwords if self.extra_passwords is not None else extract_env_passwords()
        if isinstance(record.msg, str):
            record.msg = redact_text(record.msg, pwds)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: (redact_text(v, pwds) if isinstance(v, str) else v)
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    redact_text(v, pwds) if isinstance(v, str) else v
                    for v in record.args
                )
        return True


class RedactingStream:
    """
    Stream wrapper for sys.stdout / sys.stderr that intercepts write() calls
    and redacts connection URLs and literal passwords before output.
    """
    def __init__(self, target_stream, extra_passwords: Optional[Set[str]] = None):
        self._target = target_stream
        self._extra_passwords = extra_passwords

    def write(self, s: str):
        if isinstance(s, str):
            pwds = self._extra_passwords if self._extra_passwords is not None else extract_env_passwords()
            s = redact_text(s, pwds)
        return self._target.write(s)

    def flush(self):
        if hasattr(self._target, "flush"):
            return self._target.flush()

    def isatty(self):
        if hasattr(self._target, "isatty"):
            return self._target.isatty()
        return False

    def __getattr__(self, name):
        return getattr(self._target, name)


def install_redaction_layer():
    """
    Installs the redaction filter on the root logger and all attached handlers,
    and wraps sys.stdout and sys.stderr with RedactingStream.
    Safe to call multiple times (idempotent).
    """
    env_pwds = extract_env_passwords()

    # 1. Install logging filter on root logger
    root_logger = logging.getLogger()
    has_filter = any(isinstance(f, RedactionFilter) for f in root_logger.filters)
    if not has_filter:
        root_logger.addFilter(RedactionFilter(extra_passwords=env_pwds))

    # Also attach filter to all existing handlers
    for handler in root_logger.handlers:
        if not any(isinstance(f, RedactionFilter) for f in handler.filters):
            handler.addFilter(RedactionFilter(extra_passwords=env_pwds))

    # 2. Wrap sys.stdout
    if not isinstance(sys.stdout, RedactingStream):
        sys.stdout = RedactingStream(sys.stdout, extra_passwords=env_pwds)

    # 3. Wrap sys.stderr
    if not isinstance(sys.stderr, RedactingStream):
        sys.stderr = RedactingStream(sys.stderr, extra_passwords=env_pwds)
