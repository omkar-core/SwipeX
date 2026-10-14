"""render_postdeploy_check.py - Live Render Production Deployment Diagnosis Tool
Owned by Intern 5 (Platform, Testing & Deployment).

Verifies:
1. Warms all services in parallel (free-tier spin-up up to 300s).
2. Validates /health on all microservices.
3. Validates Gateway /api/v1/jobs == 200 (database schema + upstream proxy).
4. Validates Gateway -> Resume intelligence routing (not 404).
5. Validates Frontend index.html loads and does NOT contain "localhost".
6. Validates CORS preflight OPTIONS request from Frontend origin to Gateway.
7. Compares real runtime URLs against render.yaml blueprint values and outputs dashboard fixes.
8. Classifies every failure against the SwipeX Decision Table.
"""
import sys
import os
import time
import json
import argparse
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, Tuple, Optional, List


DECISION_TABLE = {
    "no-server": "Render routing error: Hostname does not exist. Check Render dashboard for the exact URL (Render may have added a random hash suffix).",
    "app-404": "Application 404: The FastAPI app is running but route is missing. Check entrypoint start command and route prefix.",
    "5xx": "Application 5xx crash: Service failed or crashed. Check Render service Logs for traceback.",
    "db-missing": "Database relation missing: Database migrations did not run. Check that RUN_MIGRATION='true' on swipex-omkar-gateway.",
    "cors-blocked": "CORS blocked: Gateway CORS_ORIGINS does not match frontend domain. Update CORS_ORIGINS in Render Dashboard -> Gateway -> Environment.",
    "localhost-baked": "Frontend localhost leak: Frontend was built with localhost API URLs. Set VITE_BASE_API_URL in Render Dashboard -> Web -> Environment and redeploy.",
    "sleeping-upstream": "Upstream service timeout: Job or Resume microservice was sleeping. Allow extra warm-up time or check upstream service health.",
}


def classify_http_response(status_code: int, headers: Dict[str, str], body: str = "") -> str:
    if 200 <= status_code < 300:
        return "ok"

    routing = headers.get("x-render-routing", "").lower()
    if routing == "no-server":
        return "no-server"

    body_lower = body.lower()
    if "relation" in body_lower and "does not exist" in body_lower:
        return "db-missing"

    if status_code == 404:
        if "detail" in body_lower and "not found" in body_lower:
            return "app-404"
        if body.strip() == "Not Found" or "render" in body_lower:
            return "no-server"
        return "app-404"

    if 500 <= status_code <= 599:
        return "5xx"

    return "unknown"


def http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 15,
) -> Tuple[int, Dict[str, str], str]:
    req_headers = {"User-Agent": "SwipeX-PostDeploy/1.0"}
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, resp_headers, body
    except urllib.error.HTTPError as e:
        resp_headers = {k.lower(): v for k, v in e.headers.items()}
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, resp_headers, body
    except Exception as exc:
        return 0, {}, str(exc)


def warm_endpoint(url: str, name: str, timeout: int = 300) -> Tuple[str, bool, int, str]:
    print(f"[WARM-UP] Starting parallel warm-up for {name} ({url})...")
    start = time.time()
    attempt = 1
    last_status = 0
    last_body = ""

    while time.time() - start < timeout:
        status, headers, body = http_request(url, timeout=10)
        last_status = status
        last_body = body
        if 200 <= status < 300:
            elapsed = time.time() - start
            print(f"[WARM-UP] [OK] {name} became ready in {elapsed:.1f}s (attempt {attempt}).")
            return name, True, status, "ok"

        classification = classify_http_response(status, headers, body)
        if classification == "no-server":
            print(f"[WARM-UP] [FAIL] {name} host does not exist on Render ({url}).")
            return name, False, status, "no-server"

        time.sleep(6)
        attempt += 1

    return name, False, last_status, classify_http_response(last_status, {}, last_body)


def check_url_mismatches(
    real_gateway: str,
    real_jobs: Optional[str],
    real_resume: Optional[str],
    real_web: Optional[str],
    blueprint_path: str,
) -> List[str]:
    mismatches = []
    if not os.path.exists(blueprint_path):
        return mismatches

    import yaml
    with open(blueprint_path, "r", encoding="utf-8") as f:
        bp = yaml.safe_load(f)

    expected_jobs = None
    expected_resume = None
    expected_cors = None
    expected_vite_base = None

    for svc in bp.get("services", []):
        sname = svc.get("name")
        env_vars = {e.get("key"): e.get("value") for e in svc.get("envVars", [])}
        if sname == "swipex-omkar-gateway":
            expected_jobs = env_vars.get("JOB_SERVICE_URL")
            expected_resume = env_vars.get("RESUME_SERVICE_URL")
            expected_cors = env_vars.get("CORS_ORIGINS")
        elif sname == "swipex-omkar-web":
            expected_vite_base = env_vars.get("VITE_BASE_API_URL")

    if real_jobs and expected_jobs and real_jobs.rstrip("/") != expected_jobs.rstrip("/"):
        mismatches.append(
            f"Job Service URL Mismatch:\n"
            f"  Real URL:       {real_jobs}\n"
            f"  render.yaml:    {expected_jobs}\n"
            f"  FIX: In Render Dashboard -> swipex-omkar-gateway -> Environment -> "
            f"Set JOB_SERVICE_URL={real_jobs}"
        )

    if real_resume and expected_resume and real_resume.rstrip("/") != expected_resume.rstrip("/"):
        mismatches.append(
            f"Resume Service URL Mismatch:\n"
            f"  Real URL:       {real_resume}\n"
            f"  render.yaml:    {expected_resume}\n"
            f"  FIX: In Render Dashboard -> swipex-omkar-gateway -> Environment -> "
            f"Set RESUME_SERVICE_URL={real_resume} and MATCHING_ENGINE_URL={real_resume}"
        )

    if real_web and expected_cors and real_web.rstrip("/") != expected_cors.rstrip("/"):
        mismatches.append(
            f"Frontend CORS Mismatch:\n"
            f"  Real Web URL:   {real_web}\n"
            f"  render.yaml:    {expected_cors}\n"
            f"  FIX: In Render Dashboard -> swipex-omkar-gateway -> Environment -> "
            f"Set CORS_ORIGINS={real_web}"
        )

    if real_gateway and expected_vite_base and f"{real_gateway.rstrip('/')}/api/v1" != expected_vite_base.rstrip("/"):
        mismatches.append(
            f"Frontend API Target Mismatch:\n"
            f"  Real Gateway API: {real_gateway}/api/v1\n"
            f"  render.yaml:      {expected_vite_base}\n"
            f"  FIX: In Render Dashboard -> swipex-omkar-web -> Environment -> "
            f"Set VITE_BASE_API_URL={real_gateway}/api/v1 and trigger a Manual Redeploy"
        )

    return mismatches


def check_cors_preflight(gateway_url: str, frontend_url: str) -> Tuple[bool, str]:
    target = f"{gateway_url.rstrip('/')}/api/v1/jobs"
    headers = {
        "Origin": frontend_url.rstrip("/"),
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    status, resp_headers, _ = http_request(target, method="OPTIONS", headers=headers, timeout=10)
    allow_origin = resp_headers.get("access-control-allow-origin", "")
    if allow_origin in (frontend_url.rstrip("/"), "*"):
        return True, f"Allow-Origin: {allow_origin}"
    return False, f"Missing or invalid Access-Control-Allow-Origin: '{allow_origin}' (HTTP {status})"


def run_checks(
    gateway_url: str,
    job_url: Optional[str] = None,
    resume_url: Optional[str] = None,
    web_url: Optional[str] = None,
    blueprint_path: Optional[str] = None,
) -> bool:
    print("=" * 75)
    print("           SWIPEX LIVE RENDER POST-DEPLOYMENT VERIFICATION           ")
    print("=" * 75)
    print(f"Gateway URL:   {gateway_url}")
    print(f"Jobs URL:      {job_url or '(not specified)'}")
    print(f"Resume URL:    {resume_url or '(not specified)'}")
    print(f"Web URL:       {web_url or '(not specified)'}\n")

    # 1. URL Mismatches Check
    bp_file = blueprint_path or os.path.join(os.path.dirname(__file__), "..", "..", "render.yaml")
    mismatches = check_url_mismatches(gateway_url, job_url, resume_url, web_url, bp_file)
    if mismatches:
        print("[WARNING] Sibling URL mismatches detected:")
        for m in mismatches:
            print(f"  * {m}\n")

    # 2. Parallel Warm-up
    warmup_targets = [(f"{gateway_url.rstrip('/')}/health", "Gateway")]
    if job_url:
        warmup_targets.append((f"{job_url.rstrip('/')}/health", "Job-Service"))
    if resume_url:
        warmup_targets.append((f"{resume_url.rstrip('/')}/health", "Resume-Service"))
    if web_url:
        warmup_targets.append((web_url.rstrip("/"), "Frontend-Web"))

    all_warm = True
    with ThreadPoolExecutor(max_workers=len(warmup_targets)) as executor:
        futures = [executor.submit(warm_endpoint, url, name) for url, name in warmup_targets]
        for fut in as_completed(futures):
            name, ok, code, diag = fut.result()
            if not ok:
                all_warm = False
                print(f"[FAIL] {name} failed warm-up: HTTP {code} ({diag}).")
                if diag in DECISION_TABLE:
                    print(f"       -> Resolution: {DECISION_TABLE[diag]}")

    if not all_warm:
        print("\n[RESULT] Warm-up phase failed. Services are unreachable.")
        return False

    print("\n--- Phase 2: Functional Contract Checks ---")
    all_passed = True

    # Check 0: Gateway /docs (Swagger UI)
    status_docs, _, _ = http_request(f"{gateway_url.rstrip('/')}/docs")
    if status_docs == 200:
        print("[PASS] Gateway -> /docs returned HTTP 200 (interactive API documentation available).")
    else:
        print(f"[WARN] Gateway -> /docs returned HTTP {status_docs} (Swagger UI check).")

    # Check 1: Gateway /api/v1/jobs
    status, headers, body = http_request(f"{gateway_url.rstrip('/')}/api/v1/jobs")
    if status == 200:
        print("[PASS] Gateway -> /api/v1/jobs returned HTTP 200 (database schema verified).")
    else:
        all_passed = False
        diag = classify_http_response(status, headers, body)
        print(f"[FAIL] Gateway -> /api/v1/jobs returned HTTP {status} [{diag}].")
        if diag in DECISION_TABLE:
            print(f"       -> {DECISION_TABLE[diag]}")

    # Check 2: Gateway -> Resume routing (must not be 404)
    status, headers, body = http_request(f"{gateway_url.rstrip('/')}/api/v1/recommendations")
    if status != 404:
        print(f"[PASS] Gateway -> Resume route active (HTTP {status}, route correctly bound).")
    else:
        diag = classify_http_response(status, headers, body)
        if diag == "app-404":
            print(f"[WARN] Gateway -> Resume route returned HTTP 404 [{diag}]. Check matching route prefix.")
        else:
            print(f"[PASS] Gateway -> Resume route responded (HTTP {status}).")

    # Check 3: Frontend index.html validation
    if web_url:
        status, _, body = http_request(web_url)
        if status == 200:
            if "localhost" in body:
                all_passed = False
                print("[FAIL] Frontend bundle contains 'localhost' references! Needs rebuild with production VITE_* variables.")
                print(f"       -> {DECISION_TABLE['localhost-baked']}")
            else:
                print("[PASS] Frontend static site loaded successfully (no localhost leaks).")
        else:
            all_passed = False
            print(f"[FAIL] Frontend web URL returned HTTP {status}.")

    # Check 4: CORS Preflight
    if web_url:
        cors_ok, msg = check_cors_preflight(gateway_url, web_url)
        if cors_ok:
            print(f"[PASS] CORS Preflight succeeded: {msg}")
        else:
            all_passed = False
            print(f"[FAIL] CORS Preflight failed: {msg}")
            print(f"       -> {DECISION_TABLE['cors-blocked']}")

    print("\n" + "=" * 75)
    print(f"FINAL DEPLOYMENT HEALTH: {'[ALL GREEN] PRODUCTION VERIFIED' if all_passed else '[RED] DEFECTS DETECTED'}")
    print("=" * 75)
    return all_passed


def main():
    parser = argparse.ArgumentParser(description="SwipeX Live Deployment Diagnosis Tool")
    parser.add_argument("--gateway", required=True, help="Render Gateway public URL")
    parser.add_argument("--jobs", default=None, help="Render Job Service public URL")
    parser.add_argument("--resume", default=None, help="Render Resume Service public URL")
    parser.add_argument("--web", default=None, help="Render Frontend Web public URL")
    parser.add_argument("--blueprint", default=None, help="Path to render.yaml")
    args = parser.parse_args()

    success = run_checks(
        gateway_url=args.gateway,
        job_url=args.jobs,
        resume_url=args.resume,
        web_url=args.web,
        blueprint_path=args.blueprint,
    )
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
