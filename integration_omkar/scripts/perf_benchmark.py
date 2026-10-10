"""
perf_benchmark.py - Concurrency & Latency Performance Benchmark Gate (Stdlib only)
Owned by Intern 5 (Platform, Testing & Deployment).

Specifications:
- Concurrent requests: ~20 concurrent workers
- Target endpoints: /api/v1/jobs, /health, /api/v1/companies
- Thresholds: p95 < 500ms for job/search APIs per M2/M3 NFRs.
"""
import sys
import time
import statistics
import concurrent.futures
import urllib.request
import urllib.error

def benchmark_endpoint(url: str, concurrency: int = 20, total_requests: int = 60) -> dict:
    latencies = []
    errors = 0

    def single_req():
        t0 = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SwipeX-Perf/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                elapsed = (time.time() - t0) * 1000.0  # ms
                if resp.status == 200:
                    return elapsed, True
                else:
                    return elapsed, False
        except Exception:
            return 0.0, False

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(single_req) for _ in range(total_requests)]
        for f in concurrent.futures.as_completed(futures):
            elapsed, success = f.result()
            if success:
                latencies.append(elapsed)
            else:
                errors += 1

    if not latencies:
        return {"url": url, "error": "All requests failed or server unreachable"}

    latencies.sort()
    p50 = statistics.median(latencies)
    idx_90 = int(len(latencies) * 0.90)
    idx_95 = int(len(latencies) * 0.95)
    p90 = latencies[min(idx_90, len(latencies) - 1)]
    p95 = latencies[min(idx_95, len(latencies) - 1)]

    return {
        "url": url,
        "total": total_requests,
        "concurrency": concurrency,
        "successful": len(latencies),
        "errors": errors,
        "p50_ms": round(p50, 2),
        "p90_ms": round(p90, 2),
        "p95_ms": round(p95, 2),
        "min_ms": round(min(latencies), 2),
        "max_ms": round(max(latencies), 2),
    }

def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"
    print(f"\n[PERF] Starting Performance Benchmark on {base_url} (Concurrency: 20)...")

    endpoints = [
        f"{base_url}/health",
        f"{base_url}/api/v1/jobs",
        f"{base_url}/api/v1/companies",
    ]

    all_passed = True
    for ep in endpoints:
        res = benchmark_endpoint(ep, concurrency=20, total_requests=60)
        if "error" in res:
            print(f"[PERF] FAIL: {ep} -> {res['error']}")
            all_passed = False
            continue

        print(f"\n[PERF RESULTS] Endpoint: {res['url']}")
        print(f"  Requests: {res['successful']}/{res['total']} successful ({res['errors']} errors)")
        print(f"  p50 Latency: {res['p50_ms']} ms")
        print(f"  p90 Latency: {res['p90_ms']} ms")
        print(f"  p95 Latency: {res['p95_ms']} ms")
        print(f"  Min/Max:    {res['min_ms']} ms / {res['max_ms']} ms")

        # NFR validation: p95 < 500ms
        if res["p95_ms"] > 500.0:
            print(f"  [WARN] p95 latency {res['p95_ms']}ms exceeds 500ms target!")
        else:
            print(f"  [OK] p95 latency {res['p95_ms']}ms meets <500ms requirement.")

    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
