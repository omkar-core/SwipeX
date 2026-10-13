"""test_smoke_classifier.py - Unit Tests for Deployment Smoke Test Classifier
Owned by Intern 5 (Platform, Testing & Deployment).
"""
import pytest
from integration_omkar.scripts.smoke_test import classify_response


def test_classify_200_ok():
    assert classify_response(200, {}) == "ok"
    assert classify_response(201, {"content-type": "application/json"}) == "ok"


def test_classify_render_no_server_header():
    headers = {"x-render-routing": "no-server", "server": "cloudflare"}
    assert classify_response(404, headers, "Not Found") == "no-server"
    assert classify_response(502, headers, "Bad Gateway") == "no-server"


def test_classify_render_plain_404_body():
    headers = {"content-type": "text/plain; charset=utf-8"}
    assert classify_response(404, headers, "Not Found") == "no-server"
    assert classify_response(404, headers, "<html><body>Render Error</body></html>") == "no-server"


def test_classify_app_404_fastapi_json():
    headers = {"content-type": "application/json"}
    body = '{"detail": "Not Found"}'
    assert classify_response(404, headers, body) == "app-404"


def test_classify_app_5xx_crashes():
    headers = {"content-type": "application/json"}
    assert classify_response(500, headers, '{"detail": "Internal Server Error"}') == "5xx"
    assert classify_response(502, headers, "Bad Gateway") == "5xx"
    assert classify_response(503, headers, "Service Unavailable") == "5xx"
    assert classify_response(504, headers, "Gateway Timeout") == "5xx"


def test_classify_client_errors():
    headers = {"content-type": "application/json"}
    assert classify_response(400, headers, '{"detail": "Bad Request"}') == "client-error"
    assert classify_response(401, headers, '{"detail": "Not authenticated"}') == "client-error"
    assert classify_response(403, headers, '{"detail": "Forbidden"}') == "client-error"
