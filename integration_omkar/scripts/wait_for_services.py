"""
wait_for_services.py - Health check poller for SwipeX services.

Ensures Gateway (:8001), Job Service (:8002), and Resume Service (:8003)
are up and responding before running integration tests.
"""
import sys
import time
import httpx

SERVICES = [
    {"name": "Auth & Gateway Service", "url": "http://localhost:8001/health", "timeout": 5.0},
    {"name": "Job & Data Service", "url": "http://localhost:8002/health", "timeout": 5.0},
    {"name": "Resume & ATS Service", "url": "http://localhost:8003/health", "timeout": 5.0},
]

def wait_for_services(max_retries: int = 30, retry_interval: float = 2.0) -> bool:
    print("[WAIT] Polling SwipeX services for health readiness...")
    for service in SERVICES:
        name = service["name"]
        url = service["url"]
        healthy = False
        print(f"[CHECK] Waiting for {name} at {url}...")
        
        for attempt in range(1, max_retries + 1):
            try:
                response = httpx.get(url, timeout=service["timeout"])
                if response.status_code == 200:
                    print(f"  [OK] {name} is ready! (attempt {attempt})")
                    healthy = True
                    break
            except (httpx.ConnectError, httpx.TimeoutException, Exception):
                pass
            time.sleep(retry_interval)
            
        if not healthy:
            print(f"  [FAIL] {name} failed to respond within {max_retries * retry_interval}s.")
            return False
            
    print("[SUCCESS] All SwipeX backend services are up and healthy!")
    return True

if __name__ == "__main__":
    success = wait_for_services()
    sys.exit(0 if success else 1)
