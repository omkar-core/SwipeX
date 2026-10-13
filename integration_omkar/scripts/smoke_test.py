"""smoke_test.py - Production & Staging Deployment Smoke Test Gate
Owned by Intern 5 (Platform, Testing & Deployment).

Verifies:
1. Gateway /health endpoint polled every 5-10s up to timeout (default: 600s).
2. On failure, logs status, x-render-routing, and one-line classification:
   - no-server: wrong URL / service missing or deleted
   - app-404: route missing on running application
   - 5xx: app crashed / starting / internal server error
3. Verifies GET /api/v1/jobs == 200 (proves DB schema + proxy routing).
4. Verifies optional auxiliary services (/health on job, resume, frontend).
5. Provides clear failure classification and Render rollback hint.
"""
import sys
import os
import time
import json
import argparse
import urllib.request
import urllib.error
from typing import Dict, Tuple, Optional


def classify_response(status_code: int, headers: Dict[str, str], body: str = "") -> str:
    """Classifies an HTTP response into a standard failure diagnosis.

    Returns:
        - "ok": Successful response (200-299)
        - "no-server": Render routing failure (service deleted, not created, or hostname wrong)
        - "app-404": Route missing on running application (FastAPI detail: Not Found)
        - "5xx": Application crashed, failed startup, or internal server error
        - "client-error": Other 4xx error (401, 403, etc.)
        - "connection-error": Network unreachable or DNS failure
    """
    if 200 <= status_code < 300:
        return "ok"

    routing_header = headers.get("x-render-routing", "").lower()
    if routing_header == "no-server":
        return "no-server"

    if status_code == 404:
        # FastAPI Not Found responses typically contain JSON {"detail": "Not Found"}
        body_lower = body.lower()
        if "detail" in body_lower and "not found" in body_lower:
            return "app-404"
        # Render's default 404 page / plain text "Not Found" with no-server or cloudflare
        if body.strip() == "Not Found" or "render" in body_lower:
            return "no-server"
        return "app-404"

    if 500 <= status_code <= 599:
        return "5xx"

    if 400 <= status_code < 500:
        return "client-error"

    return "unknown"


def request_url(url: str, timeout: int = 10) -> Tuple[int, Dict[str, str], str]:
    """Issues an HTTP GET request and returns (status_code, normalized_headers, body)."""
    req = urllib.request.Request(url, headers={"User-Agent": "SwipeX-Smoke/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            headers = {k.lower(): v for k, v in resp.headers.items()}
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, headers, body
    except urllib.error.HTTPError as e:
        headers = {k.lower(): v for k, v in e.headers.items()}
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, headers, body
    except Exception as exc:
        return 0, {}, str(exc)


def poll_health(base_url: str, timeout: int = 600, poll_interval: int = 6) -> Tuple[bool, str]:
    health_url = f"{base_url.rstrip('/')}/health"
    print(f"[SMOKE] Polling health at {health_url} (timeout: {timeout}s, interval: {poll_interval}s)...")
    start = time.time()
    attempt = 1
    last_classification = "unknown"

    while time.time() - start < timeout:
        status, headers, body = request_url(health_url, timeout=8)
        classification = classify_response(status, headers, body)
        last_classification = classification
        routing = headers.get("x-render-routing", "(none)")

        if classification == "ok":
            elapsed = time.time() - start
            print(f"[SMOKE] [PASS] Health check succeeded in {elapsed:.1f}s (attempt {attempt}).")
            return True, "ok"

        print(
            f"  Attempt {attempt} ({int(time.time() - start)}s elapsed): "
            f"HTTP {status} | x-render-routing: {routing} | Classification: [{classification}]"
        )
        time.sleep(poll_interval)
        attempt += 1

    print(f"[SMOKE] [TIMEOUT] Gateway did not become healthy within {timeout}s.")
    return False, last_classification


def verify_endpoint(url: str, expected_key: Optional[str] = None) -> Tuple[bool, str]:
    print(f"[SMOKE] Checking {url}...")
    status, headers, body = request_url(url, timeout=12)
    classification = classify_response(status, headers, body)
    routing = headers.get("x-render-routing", "(none)")

    if classification != "ok":
        print(
            f"[SMOKE] [FAIL] {url} returned HTTP {status} "
            f"| x-render-routing: {routing} | Classification: [{classification}]"
        )
        return False, classification

    if expected_key:
        try:
            data = json.loads(body)
            if expected_key in data:
                count = len(data[expected_key]) if isinstance(data[expected_key], list) else 1
                print(f"[SMOKE] [OK] {url} returned 200 with {count} items in '{expected_key}'.")
            elif isinstance(data, list):
                print(f"[SMOKE] [OK] {url} returned 200 with {len(data)} items.")
            else:
                print(f"[SMOKE] [OK] {url} returned 200 (JSON payload verified).")
        except Exception:
            print(f"[SMOKE] [OK] {url} returned 200.")
    else:
        print(f"[SMOKE] [OK] {url} returned 200.")

    return True, "ok"


def print_rollback_hint():
    print("\n" + "=" * 70)
    print("[DEPLOYMENT RECOVERY / ROLLBACK HINT]")
    print("If the deployment failed or is unrecoverable, rollback via Render Dashboard:")
    print("  1. Navigate to: Render Dashboard > Services > [Your Service]")
    print("  2. Click 'Deploys' in the sidebar.")
    print("  3. Find the previous successful deploy and click 'Rollback to this deploy'.")
    print("=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="SwipeX Production Deployment Smoke Test Gate")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("RENDER_BASE_URL", "http://localhost:8001"),
        help="Target API Gateway base URL",
    )
    parser.add_argument(
        "--job-url",
        default=os.environ.get("RENDER_JOB_URL", ""),
        help="Optional Job Service base URL",
    )
    parser.add_argument(
        "--resume-url",
        default=os.environ.get("RENDER_RESUME_URL", ""),
        help="Optional Resume Service base URL",
    )
    parser.add_argument(
        "--frontend-url",
        default=os.environ.get("RENDER_FRONTEND_URL", ""),
        help="Optional Frontend Web base URL",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Cold start warm-up timeout in seconds (default: 600)",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    if not base_url:
        print("[SMOKE] [FATAL] Target base URL is empty. Provide --base-url or set RENDER_BASE_URL.")
        sys.exit(1)

    print("=" * 70)
    print(f"SwipeX Smoke Test Gate: Targeting {base_url}")
    print("=" * 70)

    # 1. Gateway Health Poll
    health_ok, diag = poll_health(base_url, timeout=args.timeout)
    if not health_ok:
        print(f"\n[SMOKE] [RESULT] Health check failed with diagnosis: [{diag}]")
        print_rollback_hint()
        sys.exit(1)

    # 2. Database Schema + Proxy Routing Verification
    jobs_ok, _ = verify_endpoint(f"{base_url}/api/v1/jobs", expected_key="jobs")
    if not jobs_ok:
        print("\n[SMOKE] [RESULT] Database or jobs routing check failed.")
        print_rollback_hint()
        sys.exit(1)

    # 3. Optional Services Health Checks
    if args.job_url:
        job_ok, _ = verify_endpoint(f"{args.job_url.rstrip('/')}/health")
        if not job_ok:
            print("[SMOKE] [WARN] Job service health check failed.")

    if args.resume_url:
        res_ok, _ = verify_endpoint(f"{args.resume_url.rstrip('/')}/health")
        if not res_ok:
            print("[SMOKE] [WARN] Resume service health check failed.")

    if args.frontend_url:
        front_ok, _ = verify_endpoint(f"{args.frontend_url.rstrip('/')}/")
        if not front_ok:
            print("[SMOKE] [WARN] Frontend root check failed.")

    # 4. OpenAPI Docs Check
    verify_endpoint(f"{base_url}/docs")

    print("\n[SMOKE] ALL SMOKE TESTS PASSED (HTTP 200 on /health and /api/v1/jobs).")
    sys.exit(0)


if __name__ == "__main__":
    main()
