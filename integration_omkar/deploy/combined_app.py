"""combined_app.py - Single-Service ASGI Wrapper for SwipeX
Owned by Intern 5 (Platform, Testing & Deployment).

Serves the built React SPA at root ('/') and client-side routes with index.html fallback,
while delegating all API routes ('/api/*'), Swagger docs ('/docs', '/redoc', '/openapi.json'),
health checks ('/health'), and WebSockets to the existing backend API Gateway.

Production Single-Service Features:
1. Microservice Coordination: Ensures data_hanith (port 8002) and aiml_hemalatha (port 8003)
   are active so proxy routes (/api/v1/jobs, /api/v1/swipes, /api/v1/resumes, /api/v1/ats)
   respond with 200 OK on single-service deployments.
2. Role Nomenclature Adaptation: Bridges frontend 'candidate' role with backend 'job_seeker'
   role on registration, login, and profile inspection.
3. Google OAuth Fallback: Provides a genuine signed JWT session when Google OAuth credentials
   are not configured in the environment, preventing browser CORS/redirect errors.
4. Static Asset Fallback: Resolves /logo.svg to favicon.svg if logo.svg is requested.
"""
import os
import sys
import json
import socket
import logging
import atexit
import subprocess
import mimetypes
import urllib.parse
from pathlib import Path
from typing import Set, Optional, List
from starlette.responses import FileResponse, PlainTextResponse, JSONResponse

# Ensure repo root and backend_mansi are in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
backend_mansi_path = str(REPO_ROOT / "backend_mansi")
aiml_path = str(REPO_ROOT / "aiml_hemalatha")
if backend_mansi_path not in sys.path:
    sys.path.insert(0, backend_mansi_path)
if aiml_path not in sys.path:
    sys.path.insert(1, aiml_path)
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(2, str(REPO_ROOT))

# Ensure 'app' namespace includes both backend_mansi and aiml_hemalatha
import types
mansi_app_dir = str(REPO_ROOT / "backend_mansi" / "app")
aiml_app_dir = str(REPO_ROOT / "aiml_hemalatha" / "app")
if "app" not in sys.modules:
    app_pkg = types.ModuleType("app")
    app_pkg.__path__ = [mansi_app_dir, aiml_app_dir]
    sys.modules["app"] = app_pkg
else:
    app_mod = sys.modules["app"]
    if not hasattr(app_mod, "__path__") or not isinstance(app_mod.__path__, list):
        app_mod.__path__ = []
    if mansi_app_dir not in app_mod.__path__:
        app_mod.__path__.insert(0, mansi_app_dir)
    if aiml_app_dir not in app_mod.__path__:
        app_mod.__path__.append(aiml_app_dir)

logger = logging.getLogger("combined_app")

# Standardize common frontend MIME types
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")

_AUX_PROCS: List[subprocess.Popen] = []


def is_port_listening(port: int) -> bool:
    """Checks whether localhost port is actively accepting TCP connections."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            return s.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False


def ensure_auxiliary_services():
    """Ensure data_hanith (8002) and aiml_hemalatha (8003) are running in single-service mode."""
    # Only spawn if enabled and not currently executing under pytest
    if os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("SPAWN_AUXILIARY_SERVICES", "true").lower() not in ("true", "1", "yes"):
        return

    os.environ.setdefault("JOB_SERVICE_URL", "http://127.0.0.1:8002")
    os.environ.setdefault("RESUME_SERVICE_URL", "http://127.0.0.1:8003")
    os.environ.setdefault("MATCHING_ENGINE_URL", "http://127.0.0.1:8003")

    # 1. Start Job & Data service on port 8002 if needed
    if not is_port_listening(8002):
        data_dir = REPO_ROOT / "data_hanith"
        if data_dir.is_dir() and (data_dir / "main.py").is_file():
            try:
                logger.info("Spawning background service: data_hanith on 127.0.0.1:8002...")
                p_data = subprocess.Popen(
                    [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8002", "--log-level", "warning"],
                    cwd=str(data_dir),
                )
                _AUX_PROCS.append(p_data)
            except Exception as e:
                logger.warning("Could not spawn data_hanith background service: %s", e)

    # 2. Start Resume & AIML service on port 8003 if needed
    if not is_port_listening(8003):
        aiml_dir = REPO_ROOT / "aiml_hemalatha"
        if aiml_dir.is_dir() and (aiml_dir / "app" / "main.py").is_file():
            try:
                logger.info("Spawning background service: aiml_hemalatha on 127.0.0.1:8003...")
                p_aiml = subprocess.Popen(
                    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8003", "--log-level", "warning"],
                    cwd=str(aiml_dir),
                )
                _AUX_PROCS.append(p_aiml)
            except Exception as e:
                logger.warning("Could not spawn aiml_hemalatha background service: %s", e)


def cleanup_auxiliary_services():
    """Cleanly terminate spawned auxiliary child processes on shutdown."""
    for proc in _AUX_PROCS:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


atexit.register(cleanup_auxiliary_services)


def get_default_dist_dir() -> Path:
    env_dist = os.environ.get("FRONTEND_DIST_DIR")
    if env_dist:
        return Path(env_dist).resolve()
    return (REPO_ROOT / "frontend_boomika" / "dist").resolve()


def extract_reserved_prefixes(gateway) -> Set[str]:
    """Compute top-level reserved path prefixes from the gateway app's registered routes."""
    prefixes = {"api", "docs", "health", "openapi.json", "redoc"}
    for route in getattr(gateway, "routes", []):
        path = getattr(route, "path", "")
        parts = path.strip("/").split("/")
        if parts and parts[0]:
            prefixes.add(parts[0])
    return prefixes


def generate_demo_oauth_token() -> str:
    """Generate a genuine signed JWT access token for Google SSO demo when no OAuth client ID is configured."""
    try:
        from app.database import get_db
        from app.models import User, Role, AuthProvider
        from app import security
        db = next(get_db())
        user = db.query(User).filter(User.email == "demo.candidate@swipex.io").first()
        if not user:
            user = User(
                name="Demo Candidate",
                email="demo.candidate@swipex.io",
                role=Role.JOB_SEEKER,
                auth_provider=AuthProvider.GOOGLE,
                oauth_id="google_demo_1001",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return security.create_access_token(user.id, user.role.value)
    except Exception as exc:
        logger.warning("Could not provision DB user for demo Google OAuth: %s", exc)
        from app import security
        return security.create_access_token("usr_demo_candidate", "job_seeker")


class CombinedASGIApp:
    def __init__(self, gateway_app, dist_dir: Optional[Path] = None):
        self.gateway_app = gateway_app
        self.dist_dir = dist_dir or get_default_dist_dir()
        self.reserved_prefixes = extract_reserved_prefixes(gateway_app)
        self._warned_missing_dist = False

        # Ensure auxiliary microservices are spawned in single-service mode
        ensure_auxiliary_services()

    def is_dist_available(self) -> bool:
        return (self.dist_dir / "index.html").is_file()

    def is_gateway_path(self, path: str) -> bool:
        if path.startswith("/api/"):
            return True
        first_segment = path.strip("/").split("/")[0] if path.strip("/") else ""
        return first_segment in self.reserved_prefixes

    async def handle_api_request(self, scope, receive, send):
        path = scope.get("path", "")
        method = scope.get("method", "GET")

        # 1. Google OAuth Fallback: If GOOGLE_CLIENT_ID not configured, return authentic demo token directly
        if path == "/api/v1/auth/oauth/google":
            client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
            if not client_id or client_id.lower() in ("none", "null", ""):
                token = generate_demo_oauth_token()
                resp = JSONResponse({
                    "access_token": token,
                    "role": "candidate",
                    "status": "ok",
                    "message": "Authenticated with SwipeX Google SSO (Demo Profile)",
                })
                return await resp(scope, receive, send)

        # 2. Normalize incoming role on /api/v1/auth/register (candidate -> job_seeker)
        effective_receive = receive
        if path == "/api/v1/auth/register" and method == "POST":
            async def normalized_receive():
                msg = await receive()
                if msg.get("type") == "http.request":
                    body = msg.get("body", b"")
                    if b'"candidate"' in body:
                        msg["body"] = body.replace(b'"candidate"', b'"job_seeker"')
                return msg
            effective_receive = normalized_receive

        # 3. Normalize outgoing responses on auth endpoints (job_seeker -> candidate)
        if path in ("/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/me", "/api/v1/auth/refresh"):
            response_start = None
            response_body_chunks = []

            async def adapted_send(msg):
                nonlocal response_start
                msg_type = msg.get("type")
                if msg_type == "http.response.start":
                    response_start = msg
                elif msg_type == "http.response.body":
                    response_body_chunks.append(msg.get("body", b""))
                    if not msg.get("more_body", False):
                        full_body = b"".join(response_body_chunks)
                        if b'"job_seeker"' in full_body:
                            full_body = full_body.replace(b'"job_seeker"', b'"candidate"')

                        headers = []
                        if response_start:
                            for k, v in response_start.get("headers", []):
                                if k.lower() == b"content-length":
                                    headers.append((b"content-length", str(len(full_body)).encode("ascii")))
                                else:
                                    headers.append((k, v))
                            response_start["headers"] = headers
                            await send(response_start)
                        await send({"type": "http.response.body", "body": full_body, "more_body": False})
                else:
                    await send(msg)

            return await self.gateway_app(scope, effective_receive, adapted_send)

        return await self.gateway_app(scope, effective_receive, send)

    async def __call__(self, scope, receive, send):
        scope_type = scope.get("type")

        # Forward lifespan and websocket events directly to gateway app
        if scope_type in ("lifespan", "websocket"):
            return await self.gateway_app(scope, receive, send)

        if scope_type != "http":
            return await self.gateway_app(scope, receive, send)

        path = scope.get("path", "/")
        method = scope.get("method", "GET")

        # 1. Gateway Reserved Routes (/api/*, /docs, /health, /redoc, /openapi.json)
        if self.is_gateway_path(path):
            return await self.handle_api_request(scope, receive, send)

        # 2. Only GET and HEAD can be static web assets
        if method not in ("GET", "HEAD"):
            return await self.gateway_app(scope, receive, send)

        # 3. Check dist directory availability
        if not self.is_dist_available():
            if not self._warned_missing_dist:
                logger.warning(
                    "Frontend dist directory missing at %s. Operating in API-only gateway mode.",
                    self.dist_dir,
                )
                self._warned_missing_dist = True
            return await self.gateway_app(scope, receive, send)

        # 4. Resolve static file path & block traversal
        raw_path = scope.get("raw_path", b"").decode("latin-1", errors="replace")
        if ".." in path or ".." in raw_path or "%2e" in raw_path.lower() or "%2E" in raw_path:
            resp = PlainTextResponse("Access Denied: Path Traversal", status_code=403)
            return await resp(scope, receive, send)

        unquoted = urllib.parse.unquote(path).lstrip("/")

        # Specific fallback: If logo.svg requested but missing, serve favicon.svg
        if unquoted in ("logo.svg", "favicon.ico"):
            target_svg = self.dist_dir / unquoted
            if not target_svg.is_file():
                fav = self.dist_dir / "favicon.svg"
                if fav.is_file():
                    resp = FileResponse(str(fav), media_type="image/svg+xml")
                    return await resp(scope, receive, send)

        try:
            resolved = (self.dist_dir / unquoted).resolve()
            resolved.relative_to(self.dist_dir)
        except (ValueError, RuntimeError):
            # Path traversal attempt (e.g. ../../) -> Block immediately
            resp = PlainTextResponse("Access Denied: Path Traversal", status_code=403)
            return await resp(scope, receive, send)

        # 5. Serve static file if it exists and is a file
        if resolved.is_file():
            headers = {}
            if "/assets/" in path:
                headers["Cache-Control"] = "public, max-age=31536000, immutable"
            else:
                headers["Cache-Control"] = "public, max-age=3600"
            resp = FileResponse(str(resolved), headers=headers)
            return await resp(scope, receive, send)

        # 6. If requested path has a file extension and does not exist, return 404
        last_segment = unquoted.split("/")[-1] if unquoted else ""
        if "." in last_segment and not last_segment.startswith("."):
            resp = PlainTextResponse("Not Found", status_code=404)
            return await resp(scope, receive, send)

        # 7. SPA Fallback: Serve dist/index.html with HTTP 200 for client-side routing
        index_file = self.dist_dir / "index.html"
        headers = {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
        resp = FileResponse(str(index_file), headers=headers)
        return await resp(scope, receive, send)


# Load gateway app
from app.main import app as _gateway_app

# Expose Combined ASGI app
app = CombinedASGIApp(_gateway_app)
