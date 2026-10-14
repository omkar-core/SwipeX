"""test_combined_app.py - Unit Tests for Single-Service ASGI Wrapper
Owned by Intern 5 (Platform, Testing & Deployment).
"""
import pytest
from pathlib import Path
from starlette.testclient import TestClient

# Ensure sys.path includes backend_mansi and namespace is isolated
import sys
import types
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
backend_mansi_path = str(REPO_ROOT / "backend_mansi")
aiml_path = str(REPO_ROOT / "aiml_hemalatha")
if backend_mansi_path not in sys.path:
    sys.path.insert(0, backend_mansi_path)
if aiml_path not in sys.path:
    sys.path.insert(1, aiml_path)

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

from app.main import app as gateway_app
from integration_omkar.deploy.combined_app import CombinedASGIApp


@pytest.fixture
def mock_dist(tmp_path):
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    index_html = dist_dir / "index.html"
    index_html.write_text("<!DOCTYPE html><html><body><div id='root'>SwipeX React App</div></body></html>", encoding="utf-8")
    
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir()
    app_js = assets_dir / "app.js"
    app_js.write_text("console.log('SwipeX App');", encoding="utf-8")

    app_css = assets_dir / "main.css"
    app_css.write_text("body { margin: 0; }", encoding="utf-8")

    favicon = dist_dir / "favicon.ico"
    favicon.write_text("fake-icon-content", encoding="utf-8")

    favicon_svg = dist_dir / "favicon.svg"
    favicon_svg.write_text("<svg>favicon-content</svg>", encoding="utf-8")

    secret_file = tmp_path / "secret.txt"
    secret_file.write_text("TOP_SECRET_CONTENT", encoding="utf-8")

    return dist_dir


def test_get_and_head_root_serves_index_html(mock_dist):
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    # GET /
    res_get = client.get("/")
    assert res_get.status_code == 200
    assert "SwipeX React App" in res_get.text
    assert "text/html" in res_get.headers.get("content-type", "")
    assert res_get.headers.get("cache-control") == "no-cache, no-store, must-revalidate"

    # HEAD /
    res_head = client.head("/")
    assert res_head.status_code == 200
    assert "text/html" in res_head.headers.get("content-type", "")


def test_static_asset_served_with_correct_mime_and_immutable_cache(mock_dist):
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    res_js = client.get("/assets/app.js")
    assert res_js.status_code == 200
    assert "console.log('SwipeX App');" in res_js.text
    assert "javascript" in res_js.headers.get("content-type", "")
    assert "immutable" in res_js.headers.get("cache-control", "")

    res_css = client.get("/assets/main.css")
    assert res_css.status_code == 200
    assert "text/css" in res_css.headers.get("content-type", "")
    assert "immutable" in res_css.headers.get("cache-control", "")


def test_deep_client_routes_spa_fallback(mock_dist):
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    # Any client-side SPA deep route should serve index.html with 200 OK
    for path in ["/login", "/register", "/swipe", "/swipe/123", "/admin", "/admin/analytics", "/onboarding"]:
        res = client.get(path)
        assert res.status_code == 200
        assert "SwipeX React App" in res.text
        assert "text/html" in res.headers.get("content-type", "")
        assert res.headers.get("cache-control") == "no-cache, no-store, must-revalidate"


def test_unknown_api_path_returns_gateway_404_json(mock_dist):
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    res = client.get("/api/v1/unknown-endpoint-that-does-not-exist")
    assert res.status_code == 404
    assert res.headers.get("content-type") == "application/json"
    data = res.json()
    assert data.get("detail") == "Not Found"
    assert "SwipeX React App" not in res.text


def test_reserved_gateway_routes_reach_gateway(mock_dist):
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    # /health
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json().get("status") in ("ok", "healthy")

    # /docs
    res_docs = client.get("/docs")
    assert res_docs.status_code == 200

    # /openapi.json
    res_openapi = client.get("/openapi.json")
    assert res_openapi.status_code == 200
    assert "openapi" in res_openapi.json()


def test_path_traversal_is_blocked(mock_dist):
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    traversal_paths = [
        "/../secret.txt",
        "/../../secret.txt",
        "/%2e%2e/secret.txt",
        "/%2e%2e/%2e%2e/secret.txt",
        "/assets/../../secret.txt",
    ]

    for p in traversal_paths:
        res = client.get(p)
        # Must be blocked (403, 404, or 400), NEVER leak secret content
        assert res.status_code in (400, 403, 404)
        assert "TOP_SECRET_CONTENT" not in res.text


def test_missing_dist_graceful_fallback(tmp_path):
    # Non-existent dist directory
    empty_dist = tmp_path / "non_existent_dist"
    app = CombinedASGIApp(gateway_app, dist_dir=empty_dist)
    client = TestClient(app)

    # Root / returns gateway's default 404 JSON, does not crash
    res = client.get("/")
    assert res.status_code == 404
    assert res.headers.get("content-type") == "application/json"

    # Gateway API /health still functions normally
    res_health = client.get("/health")
    assert res_health.status_code == 200


def test_gateway_app_routes_unmutated(mock_dist):
    routes_before = [r.path for r in gateway_app.routes]
    
    # Instantiate Combined app
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    _ = TestClient(app)

    routes_after = [r.path for r in gateway_app.routes]
    assert routes_before == routes_after


def test_logo_svg_fallback(mock_dist):
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    res = client.get("/logo.svg")
    assert res.status_code == 200
    assert "svg" in res.headers.get("content-type", "")
    assert "favicon-content" in res.text


def test_auth_register_candidate_role_adaptation(mock_dist):
    import uuid
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    random_email = f"candidate_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Candidate User",
        "email": random_email,
        "password": "Password123!",
        "role": "candidate"  # Frontend uses candidate; gateway uses job_seeker
    }

    # Must NOT fail with 422 Unprocessable Content
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "user_id" in data


def test_google_oauth_fallback(mock_dist, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "")
    app = CombinedASGIApp(gateway_app, dist_dir=mock_dist)
    client = TestClient(app)

    res = client.get("/api/v1/auth/oauth/google")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data.get("role") == "candidate"
