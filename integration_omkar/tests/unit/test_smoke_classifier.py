"""test_smoke_classifier.py - Unit Tests for Deployment Smoke Test Classifier & URL Validation
Owned by Intern 5 (Platform, Testing & Deployment).
"""
import pytest
from integration_omkar.scripts.smoke_test import classify_response
from integration_omkar.scripts.render_postdeploy_check import (
    classify_http_response,
    check_url_mismatches,
    check_cors_preflight,
)
from integration_omkar.scripts.render_preflight import validate_blueprint


def test_classify_200_ok():
    assert classify_response(200, {}) == "ok"
    assert classify_response(201, {"content-type": "application/json"}) == "ok"
    assert classify_http_response(200, {}) == "ok"


def test_classify_render_no_server_header():
    headers = {"x-render-routing": "no-server", "server": "cloudflare"}
    assert classify_response(404, headers, "Not Found") == "no-server"
    assert classify_response(502, headers, "Bad Gateway") == "no-server"
    assert classify_http_response(404, headers, "Not Found") == "no-server"


def test_classify_render_plain_404_body():
    headers = {"content-type": "text/plain; charset=utf-8"}
    assert classify_response(404, headers, "Not Found") == "no-server"
    assert classify_response(404, headers, "<html><body>Render Error</body></html>") == "no-server"
    assert classify_http_response(404, headers, "Not Found") == "no-server"


def test_classify_app_404_fastapi_json():
    headers = {"content-type": "application/json"}
    body = '{"detail": "Not Found"}'
    assert classify_response(404, headers, body) == "app-404"
    assert classify_http_response(404, headers, body) == "app-404"


def test_classify_database_missing_relation():
    headers = {"content-type": "text/plain"}
    body = 'psycopg2.errors.UndefinedTable: relation "jobs" does not exist'
    assert classify_http_response(500, headers, body) == "db-missing"


def test_classify_app_5xx_crashes():
    headers = {"content-type": "application/json"}
    assert classify_response(500, headers, '{"detail": "Internal Server Error"}') == "5xx"
    assert classify_response(502, headers, "Bad Gateway") == "5xx"
    assert classify_response(503, headers, "Service Unavailable") == "5xx"
    assert classify_response(504, headers, "Gateway Timeout") == "5xx"
    assert classify_http_response(500, headers, '{"detail": "Internal Server Error"}') == "5xx"


def test_classify_client_errors():
    headers = {"content-type": "application/json"}
    assert classify_response(400, headers, '{"detail": "Bad Request"}') == "client-error"
    assert classify_response(401, headers, '{"detail": "Not authenticated"}') == "client-error"
    assert classify_response(403, headers, '{"detail": "Forbidden"}') == "client-error"


def test_check_url_mismatches_clean(tmp_path):
    bp_content = """
services:
  - name: swipex-omkar-gateway
    envVars:
      - key: JOB_SERVICE_URL
        value: https://swipex-omkar-jobs.onrender.com
      - key: RESUME_SERVICE_URL
        value: https://swipex-omkar-resume.onrender.com
      - key: CORS_ORIGINS
        value: https://swipex-omkar-web.onrender.com
  - name: swipex-omkar-web
    envVars:
      - key: VITE_BASE_API_URL
        value: https://swipex-omkar-gateway.onrender.com/api/v1
"""
    p = tmp_path / "render.yaml"
    p.write_text(bp_content, encoding="utf-8")

    mismatches = check_url_mismatches(
        real_gateway="https://swipex-omkar-gateway.onrender.com",
        real_jobs="https://swipex-omkar-jobs.onrender.com",
        real_resume="https://swipex-omkar-resume.onrender.com",
        real_web="https://swipex-omkar-web.onrender.com",
        blueprint_path=str(p),
    )
    assert len(mismatches) == 0


def test_check_url_mismatches_detected(tmp_path):
    bp_content = """
services:
  - name: swipex-omkar-gateway
    envVars:
      - key: JOB_SERVICE_URL
        value: https://swipex-omkar-jobs.onrender.com
      - key: RESUME_SERVICE_URL
        value: https://swipex-omkar-resume.onrender.com
      - key: CORS_ORIGINS
        value: https://swipex-omkar-web.onrender.com
  - name: swipex-omkar-web
    envVars:
      - key: VITE_BASE_API_URL
        value: https://swipex-omkar-gateway.onrender.com/api/v1
"""
    p = tmp_path / "render.yaml"
    p.write_text(bp_content, encoding="utf-8")

    # Suppose Render assigned a suffixed name to jobs and web
    mismatches = check_url_mismatches(
        real_gateway="https://swipex-omkar-gateway.onrender.com",
        real_jobs="https://swipex-omkar-jobs-9abc.onrender.com",
        real_resume="https://swipex-omkar-resume.onrender.com",
        real_web="https://swipex-omkar-web-1xyz.onrender.com",
        blueprint_path=str(p),
    )
    assert len(mismatches) == 2
    assert "Job Service URL Mismatch" in mismatches[0]
    assert "Frontend CORS Mismatch" in mismatches[1]


def test_blueprint_preflight_validation():
    valid_data = {
        "databases": [{"name": "db1", "plan": "free", "region": "oregon"}],
        "services": [
            {
                "name": "svc1",
                "type": "web",
                "plan": "free",
                "region": "oregon",
                "runtime": "python",
                "envVars": [
                    {"key": "PYTHON_VERSION", "value": "3.11.9"},
                    {"key": "RUN_MIGRATION", "value": "true"},
                ],
            },
            {
                "name": "web1",
                "type": "web",
                "plan": "free",
                "region": "oregon",
                "runtime": "static",
                "staticPublishPath": "dist",
                "routes": [{"type": "rewrite", "source": "/*", "destination": "/index.html"}],
                "envVars": [{"key": "NODE_VERSION", "value": "20.18.0"}],
            },
        ],
    }
    is_valid, errors, meta = validate_blueprint(valid_data)
    assert is_valid is True
    assert len(errors) == 0
    assert meta["migration_runners"] == ["svc1"]


def test_postdeploy_check_api_only_mode(monkeypatch):
    from integration_omkar.scripts.render_postdeploy_check import run_checks

    def mock_http_request(url, method="GET", headers=None, timeout=15):
        if url.endswith("/health"):
            return 200, {"content-type": "application/json"}, '{"status": "ok"}'
        if url.endswith("/docs"):
            return 200, {"content-type": "text/html"}, "<html>Swagger UI</html>"
        if url.endswith("/api/v1/jobs"):
            return 200, {"content-type": "application/json"}, '{"jobs": []}'
        if url.endswith("/api/v1/recommendations"):
            return 200, {"content-type": "application/json"}, '{"items": []}'
        if url.rstrip("/").endswith(".onrender.com"):
            # Root path in API-only mode returns 404 JSON
            return 404, {"content-type": "application/json"}, '{"detail": "Not Found"}'
        return 404, {}, "Not Found"

    monkeypatch.setattr("integration_omkar.scripts.render_postdeploy_check.http_request", mock_http_request)
    success = run_checks(gateway_url="https://fake-gw.onrender.com", single_service=False)
    assert success is True


def test_postdeploy_check_single_service_mode(monkeypatch):
    from integration_omkar.scripts.render_postdeploy_check import run_checks

    def mock_http_request(url, method="GET", headers=None, timeout=15):
        if url.endswith("/health"):
            return 200, {"content-type": "application/json"}, '{"status": "ok"}'
        if url.endswith("/docs"):
            return 200, {"content-type": "text/html"}, "<html>Swagger UI</html>"
        if url.endswith("/api/v1/jobs"):
            return 200, {"content-type": "application/json"}, '{"jobs": []}'
        if url.endswith("/api/v1/recommendations"):
            return 200, {"content-type": "application/json"}, '{"items": []}'
        if url.endswith("/login") or url.rstrip("/").endswith(".onrender.com"):
            # Root and client route in single-service mode returns 200 HTML with React root
            return 200, {"content-type": "text/html"}, '<html><body><div id="root">SwipeX</div></body></html>'
        return 404, {}, "Not Found"

    monkeypatch.setattr("integration_omkar.scripts.render_postdeploy_check.http_request", mock_http_request)
    success = run_checks(gateway_url="https://fake-gw.onrender.com", single_service=True)
    assert success is True
