#!/usr/bin/env python3
"""
wait_for_stack.py - Stack Readiness Gate & Health Poller
Owned by Intern 5 (Platform, Testing & Deployment).

Polls all service health endpoints and proves end-to-end data readiness:
1. Gateway health (/health on 8001)
2. Job service health (/health on 8002)
3. Resume service health (/health on 8003)
4. Gateway proxy to jobs (GET /api/v1/jobs -> 200 + valid list)
5. Gateway proxy to companies (GET /api/v1/companies -> 200 + valid list)

Guarantees database schema migrations and seed data are fully applied
before live integration tests begin.
"""
import sys
import time
import urllib.request
import urllib.error
import json

def check_endpoint(url: str, expected_code: int = 200, check_non_empty_list: bool = False) -> tuple[bool, str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SwipeX-Readiness-Gate"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.getcode()
            if status != expected_code:
                return False, f"Expected {expected_code}, got {status}"
            if check_non_empty_list:
                data = json.loads(resp.read().decode("utf-8"))
                if not isinstance(data, list) or len(data) == 0:
                    return False, f"Returned empty or invalid payload: {data}"
            return True, f"HTTP {status} OK"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.reason}"
    except Exception as e:
        return False, f"Connection failed: {e}"

def wait_for_stack(gateway_url: str = "http://localhost:8001",
                   job_url: str = "http://localhost:8002",
                   resume_url: str = "http://localhost:8003",
                   max_timeout: int = 120,
                   poll_interval: float = 2.0) -> bool:
    start_time = time.time()
    checks = [
        ("Auth Gateway /health", f"{gateway_url}/health", False),
        ("Job Service /health", f"{job_url}/health", False),
        ("Resume Service /health", f"{resume_url}/health", False),
        ("Live Jobs Seeded (Gateway /api/v1/jobs)", f"{gateway_url}/api/v1/jobs", True),
        ("Live Companies Seeded (Gateway /api/v1/companies)", f"{gateway_url}/api/v1/companies", True),
    ]

    print(f"=== SwipeX Stack Readiness Gate (Timeout: {max_timeout}s) ===")
    
    while time.time() - start_time < max_timeout:
        all_passed = True
        status_line = []
        for name, url, check_list in checks:
            ok, msg = check_endpoint(url, expected_code=200, check_non_empty_list=check_list)
            if not ok:
                all_passed = False
                status_line.append(f"[{name}: {msg}]")
            else:
                status_line.append(f"[{name}: READY]")

        elapsed = int(time.time() - start_time)
        if all_passed:
            print(f"\n[+{elapsed}s] ALL SERVICES HEALTHY & DATA SEED CONFIRMED!")
            for name, url, _ in checks:
                print(f"  [OK] {name} -> {url}")
            return True

        print(f"[{elapsed}s] Waiting for stack... " + " | ".join(status_line))
        time.sleep(poll_interval)

    print(f"\n[ERROR] Stack readiness timed out after {max_timeout} seconds.")
    return False

if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"
    success = wait_for_stack(gateway_url=base)
    sys.exit(0 if success else 1)
