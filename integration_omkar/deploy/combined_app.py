"""combined_app.py - Single-Service ASGI Wrapper for SwipeX
Owned by Intern 5 (Platform, Testing & Deployment).

Serves the built React SPA at root ('/') and client-side routes with index.html fallback,
while delegating all API routes ('/api/*'), Swagger docs ('/docs', '/redoc', '/openapi.json'),
health checks ('/health'), and WebSockets to the existing backend API Gateway.

Guarantees:
1. Does NOT mutate the gateway app object (leaves routes & middleware intact).
2. Gracefully falls back to API-only mode if frontend dist is missing (never crashes).
3. Blocks directory traversal (../, %2e%2e/, //) outside the dist folder.
4. Preserves FastAPI 404 JSON for unknown /api/* routes (never serves index.html).
5. Implements proper Cache-Control (immutable for /assets/*, no-cache for index.html).
"""
import os
import sys
import logging
import mimetypes
import urllib.parse
from pathlib import Path
from typing import Set, Optional
from starlette.responses import FileResponse, PlainTextResponse

# Ensure repo root and backend_mansi are in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
backend_mansi_path = REPO_ROOT / "backend_mansi"
if str(backend_mansi_path) not in sys.path:
    sys.path.insert(0, str(backend_mansi_path))

logger = logging.getLogger("combined_app")

# Standardize common frontend MIME types
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")


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


class CombinedASGIApp:
    def __init__(self, gateway_app, dist_dir: Optional[Path] = None):
        self.gateway_app = gateway_app
        self.dist_dir = dist_dir or get_default_dist_dir()
        self.reserved_prefixes = extract_reserved_prefixes(gateway_app)
        self._warned_missing_dist = False

    def is_dist_available(self) -> bool:
        return (self.dist_dir / "index.html").is_file()

    def is_gateway_path(self, path: str) -> bool:
        if path.startswith("/api/"):
            return True
        first_segment = path.strip("/").split("/")[0] if path.strip("/") else ""
        return first_segment in self.reserved_prefixes

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
            return await self.gateway_app(scope, receive, send)

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
