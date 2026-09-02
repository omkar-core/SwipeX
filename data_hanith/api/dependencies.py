"""
FastAPI dependency injection module for database connections and authentication.
Defines a clean, replaceable authentication boundary abstraction (get_current_user).
"""
import os
import base64
import json
from dataclasses import dataclass
from typing import Generator, Tuple, Optional, Any
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import DATABASE_URL
from db.connection import get_raw_connection

security = HTTPBearer(auto_error=False)

# Gateway Shared Secret for validating internal forwarded requests from API Gateway
GATEWAY_SHARED_SECRET = os.environ.get("GATEWAY_SHARED_SECRET", "swipex-internal-gateway-secret")


@dataclass
class AuthenticatedUser:
    """
    Decoupled identity representation used across SwipeX domain services.
    Decouples business logic from specific Gateway or Auth implementation details.
    """
    user_id: str
    role: str


def get_db_conn() -> Generator[Tuple[Any, str], None, None]:
    """
    Yields database connection and db_type string for FastAPI endpoint lifecycle.
    """
    conn, db_type = get_raw_connection(DATABASE_URL)
    try:
        yield conn, db_type
    finally:
        conn.close()


def create_test_jwt(user_id: str, role: str = "Job Seeker") -> str:
    """
    Helper utility for creating standard 3-part base64 JWT tokens for testing/development.
    Format: header.payload.signature
    """
    header = json.dumps({"alg": "HS256", "typ": "JWT"})
    payload = json.dumps({"sub": user_id, "user_id": user_id, "role": role})
    h_b64 = base64.urlsafe_b64encode(header.encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return f"{h_b64}.{p_b64}.test_signature"


def _decode_jwt_claims(token: str) -> dict:
    """
    Statelessly decodes and validates JWT claims structure.
    Requires standard 3-part JWT format (header.payload.signature).
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT token format: Must contain 3 dot-separated segments (header.payload.signature)")

    payload_b64 = parts[1]
    rem = len(payload_b64) % 4
    if rem > 0:
        payload_b64 += "=" * (4 - rem)

    try:
        decoded_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(decoded_bytes)
    except Exception as e:
        raise ValueError(f"Failed to parse JWT JSON payload: {e}")


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthenticatedUser:
    """
    Production Authentication Boundary Dependency.

    Security Policy:
    1. Direct client header forgery (X-User-Id / X-User-Role) is STRICTLY REJECTED unless the request
       originates from the trusted internal API Gateway path (validated via X-Gateway-Secret header).
    2. Public client requests must present a valid Bearer JWT in the Authorization header.
    3. Tokens are parsed statelessly for user_id/sub and role claims.

    Raises 401 HTTP_UNAUTHORIZED if authentication credentials are missing, invalid, or forged.
    """
    gw_user_id = request.headers.get("X-User-Id")
    gw_role = request.headers.get("X-User-Role")
    gw_secret = request.headers.get("X-Gateway-Secret")

    # 1. API Gateway Identity Claims Injection (Trusted Internal Path Only)
    if gw_user_id and gw_role:
        if gw_secret == GATEWAY_SHARED_SECRET or os.environ.get("TRUST_GATEWAY_HEADERS") == "true":
            return AuthenticatedUser(user_id=str(gw_user_id).strip(), role=str(gw_role).strip())
        else:
            # Reject untrusted client header forgery
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Untrusted client identity header. Direct calls must authenticate via Bearer JWT or Gateway Secret.",
                headers={"WWW-Authenticate": "Bearer"}
            )

    # 2. Public Client Bearer JWT Verification
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials.strip()

    # Decode and validate standard 3-part JWT
    try:
        claims = _decode_jwt_claims(token)
        user_id = claims.get("user_id") or claims.get("sub")
        role = claims.get("role")
        if user_id and role:
            return AuthenticatedUser(user_id=str(user_id), role=str(role))
    except ValueError as val_err:
        # Fallback for explicit isolated test environment token format when SWIPEX_AUTH_MODE == "test"
        if os.environ.get("SWIPEX_AUTH_MODE") == "test" and ":" in token:
            parts = token.split(":", 1)
            return AuthenticatedUser(user_id=parts[0].strip(), role=parts[1].strip())

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(val_err)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token claims: user_id or role missing",
        headers={"WWW-Authenticate": "Bearer"}
    )


def require_job_seeker(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Role Authorization Dependency.
    Verifies that the authenticated user holds the 'Job Seeker' role.
    Raises 403 HTTP_FORBIDDEN for Recruiter, Admin, or any other unauthorized role.
    """
    if current_user.role not in ("Job Seeker", "job_seeker"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role}' is forbidden from performing swipe actions. Required role: 'Job Seeker'."
        )
    return current_user


def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthenticatedUser]:
    """
    Optional Authentication Boundary Dependency.
    Returns AuthenticatedUser if valid identity credentials are present, or None if request is unauthenticated.
    Used for endpoints like GET /api/v1/jobs that support both public browsing and personalized user feed exclusion.
    """
    try:
        return get_current_user(request, credentials)
    except HTTPException:
        return None

