#!/usr/bin/env python3
"""
run_suites.py - Single Source of Truth Unified Test Runner for SwipeX
Owned by Intern 5 (Platform, Testing & Deployment).

Executes every test suite in an isolated subprocess with its own working directory
and PYTHONPATH, preventing package namespace collisions ('app' package in backend vs aiml).

Usage:
  python integration_omkar/scripts/run_suites.py --suite all
  python integration_omkar/scripts/run_suites.py --suite ci --no-docker
  python integration_omkar/scripts/run_suites.py --suite backend
  python integration_omkar/scripts/run_suites.py --suite frontend
"""
import os
import sys
import argparse
import subprocess
import re
import time
import shutil

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

class SuiteResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.duration = 0.0
        self.exit_code = 0
        self.message = ""

def parse_pytest_output(stdout: str) -> tuple[int, int, int]:
    passed = 0
    failed = 0
    skipped = 0
    # Match patterns like: "= 46 passed, 6 warnings in 38.05s ="
    match = re.search(r"==+ (.*?) in \d+\.?\d*s ==", stdout)
    if match:
        summary_text = match.group(1)
        pass_match = re.search(r"(\d+)\s+passed", summary_text)
        if pass_match:
            passed = int(pass_match.group(1))
        fail_match = re.search(r"(\d+)\s+failed", summary_text)
        if fail_match:
            failed = int(fail_match.group(1))
        skip_match = re.search(r"(\d+)\s+skipped", summary_text)
        if skip_match:
            skipped = int(skip_match.group(1))
    else:
        # Fallback line-by-line inspection
        pass_match = re.search(r"(\d+)\s+passed", stdout)
        if pass_match:
            passed = int(pass_match.group(1))
        fail_match = re.search(r"(\d+)\s+failed", stdout)
        if fail_match:
            failed = int(fail_match.group(1))
        skip_match = re.search(r"(\d+)\s+skipped", stdout)
        if skip_match:
            skipped = int(skip_match.group(1))
    return passed, failed, skipped

def run_cmd(cmd: list[str], cwd: str, env: dict, suite_name: str) -> SuiteResult:
    res = SuiteResult(suite_name)
    start = time.time()
    print(f"\n[{suite_name.upper()}] Running: {' '.join(cmd)} (cwd={os.path.relpath(cwd, BASE_DIR)})")
    
    proc = subprocess.run(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    res.duration = time.time() - start
    res.exit_code = proc.returncode
    output = proc.stdout

    if "pytest" in cmd:
        p, f, s = parse_pytest_output(output)
        res.passed = p
        res.failed = f
        res.skipped = s
        if proc.returncode != 0 and res.failed == 0:
            res.failed = 1
    elif suite_name == "frontend":
        # Check vitest pass output
        vitest_match = re.search(r"Tests\s+(\d+)\s+passed", output)
        if vitest_match:
            res.passed = int(vitest_match.group(1))
        elif proc.returncode == 0:
            res.passed = 1
        else:
            res.failed = 1
    elif suite_name == "flake8":
        if proc.returncode == 0:
            res.passed = 1
            res.message = "Clean syntax & import checks"
        else:
            res.failed = len([line for line in output.splitlines() if line.strip()])
            res.message = "Flake8 violations found"
    elif suite_name == "render-config":
        if proc.returncode == 0:
            res.passed = 1
            res.message = "render.yaml & compose valid"
        else:
            res.failed = 1
            res.message = "Configuration invalid"
    else:
        if proc.returncode == 0:
            res.passed = 1
        else:
            res.failed = 1

    # Print summary of this suite
    status_str = "PASS" if res.exit_code == 0 else "FAIL"
    print(f"[{suite_name.upper()}] Finished in {res.duration:.2f}s -> {status_str} ({res.passed} passed, {res.failed} failed, {res.skipped} skipped)")
    if res.exit_code != 0:
        print("--- Output excerpt on failure ---")
        lines = output.splitlines()
        print("\n".join(lines[-25:] if len(lines) > 25 else lines))
        print("---------------------------------")
    return res

def run_suite_backend() -> SuiteResult:
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'backend_mansi')}"
    cmd = [sys.executable, "-m", "pytest", "backend_mansi/tests", "-v", "--tb=short"]
    return run_cmd(cmd, cwd=BASE_DIR, env=env, suite_name="backend")

def run_suite_aiml() -> SuiteResult:
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'aiml_hemalatha')}:{os.path.join(BASE_DIR, 'integration_omkar', 'docker', 'shim')}"
    cmd = [sys.executable, "-m", "pytest", "aiml_hemalatha/tests", "-v", "--tb=short"]
    return run_cmd(cmd, cwd=BASE_DIR, env=env, suite_name="aiml")

def run_suite_data() -> SuiteResult:
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'data_hanith')}"
    # Runs the canonical ingestion verification
    cmd = [sys.executable, "-m", "pytest", "tests/test_dataset1_ingestion.py", "-v", "--tb=short"]
    return run_cmd(cmd, cwd=BASE_DIR, env=env, suite_name="data")

def run_suite_m3_schema() -> SuiteResult:
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'data_hanith')}"
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/test_m3_day2_schema_and_storage.py",
        "tests/test_m3_day3_job_enrichment.py",
        "tests/test_m3_day4_resume_job_queries.py",
        "tests/test_m3_day5_integration_integrity.py",
        "tests/test_m3_day6_repository_query_optimization.py",
        "-v", "--tb=short"
    ]
    return run_cmd(cmd, cwd=BASE_DIR, env=env, suite_name="m3-schema")

def run_suite_m4() -> SuiteResult:
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'data_hanith')}"
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/test_m4_day1_foundation.py",
        "tests/test_m4_day2_integration.py",
        "tests/test_m4_day3_analytics.py",
        "tests/test_m4_day4_optimization_and_concurrency.py",
        "tests/test_m4_day5_production_finalization.py",
        "-v", "--tb=short"
    ]
    return run_cmd(cmd, cwd=BASE_DIR, env=env, suite_name="m4")

def run_suite_integration_unit() -> SuiteResult:
    # 1. AIML fixes unit tests (requires aiml_hemalatha as app)
    env_aiml = os.environ.copy()
    env_aiml["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'aiml_hemalatha')}:{os.path.join(BASE_DIR, 'integration_omkar', 'docker', 'shim')}"
    cmd_aiml = [sys.executable, "-m", "pytest", "integration_omkar/tests/unit/test_aiml_fixes.py", "-v", "--tb=short"]
    res_aiml = run_cmd(cmd_aiml, cwd=BASE_DIR, env=env_aiml, suite_name="aiml-fixes-unit")

    # 2. Gateway route contract tests (requires backend_mansi as app)
    env_gateway = os.environ.copy()
    env_gateway["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'backend_mansi')}"
    cmd_gateway = [sys.executable, "-m", "pytest", "integration_omkar/tests/test_gateway_route_contract.py", "-v", "--tb=short"]
    res_gateway = run_cmd(cmd_gateway, cwd=BASE_DIR, env=env_gateway, suite_name="gateway-route-contract")

    combined = SuiteResult("integration-unit")
    combined.passed = res_aiml.passed + res_gateway.passed
    combined.failed = res_aiml.failed + res_gateway.failed
    combined.skipped = res_aiml.skipped + res_gateway.skipped
    combined.duration = res_aiml.duration + res_gateway.duration
    combined.exit_code = 0 if (res_aiml.exit_code == 0 and res_gateway.exit_code == 0) else 1
    return combined

def run_suite_flake8() -> SuiteResult:
    cmd = [
        sys.executable, "-m", "flake8",
        "--select=E9,F63,F7,F82",
        "integration_omkar",
        "backend_mansi",
        "aiml_hemalatha",
        "data_hanith"
    ]
    return run_cmd(cmd, cwd=BASE_DIR, env=os.environ.copy(), suite_name="flake8")

def run_suite_frontend() -> SuiteResult:
    frontend_dir = os.path.join(BASE_DIR, "frontend_boomika")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    # Run test
    test_res = run_cmd([npm_cmd, "run", "test", "--", "--run"], cwd=frontend_dir, env=os.environ.copy(), suite_name="frontend-test")
    # Run lint
    lint_res = run_cmd([npm_cmd, "run", "lint"], cwd=frontend_dir, env=os.environ.copy(), suite_name="frontend-lint")
    # Run build
    build_res = run_cmd([npm_cmd, "run", "build"], cwd=frontend_dir, env=os.environ.copy(), suite_name="frontend-build")

    combined = SuiteResult("frontend")
    combined.passed = test_res.passed
    combined.failed = test_res.failed + lint_res.failed + build_res.failed
    combined.skipped = test_res.skipped
    combined.duration = test_res.duration + lint_res.duration + build_res.duration
    combined.exit_code = 0 if (test_res.exit_code == 0 and lint_res.exit_code == 0 and build_res.exit_code == 0) else 1
    return combined

def run_suite_render_config() -> SuiteResult:
    # 1. Validate render.yaml
    render_yaml_path = os.path.join(BASE_DIR, "render.yaml")
    cmd_yaml = [sys.executable, "-c", f"import yaml; yaml.safe_load(open(r'{render_yaml_path}'))"]
    yaml_res = run_cmd(cmd_yaml, cwd=BASE_DIR, env=os.environ.copy(), suite_name="render-yaml")

    # 2. Validate docker compose
    docker_cmd = "docker"
    compose_res = run_cmd([docker_cmd, "compose", "-f", "docker-compose.dev.yml", "config"], cwd=BASE_DIR, env=os.environ.copy(), suite_name="compose-config")

    combined = SuiteResult("render-config")
    combined.passed = 1 if (yaml_res.exit_code == 0 and compose_res.exit_code == 0) else 0
    combined.failed = 1 if (yaml_res.exit_code != 0 or compose_res.exit_code != 0) else 0
    combined.duration = yaml_res.duration + compose_res.duration
    combined.exit_code = 0 if combined.failed == 0 else 1
    return combined

def run_suite_integration_live() -> SuiteResult:
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BASE_DIR}:{os.path.join(BASE_DIR, 'integration_omkar')}:{os.path.join(BASE_DIR, 'backend_mansi')}"
    cmd = [
        sys.executable, "-m", "pytest",
        "integration_omkar/tests/test_e2e_gateway_flow.py",
        "integration_omkar/tests/test_cross_service_rbac.py",
        "integration_omkar/tests/test_m2_e2e_flow.py",
        "integration_omkar/tests/test_m2_job_discovery.py",
        "integration_omkar/tests/test_m2_swipe_system.py",
        "integration_omkar/tests/test_m2_company_api.py",
        "integration_omkar/tests/test_m2_matching_engine.py",
        "integration_omkar/tests/test_m3_day3_functional.py",
        "integration_omkar/tests/test_e2e_resume_flow.py",
        "integration_omkar/tests/test_m2_search_and_filter.py",
        "integration_omkar/tests/test_m2_competition_freshness.py",
        "integration_omkar/tests/test_m3_resume_upload_scaffold.py",
        "integration_omkar/tests/test_m3_storage_vector_mocks.py",
        "-v", "--tb=short"
    ]
    return run_cmd(cmd, cwd=BASE_DIR, env=env, suite_name="integration-live")

def run_suite_security() -> SuiteResult:
    cmd = [sys.executable, "integration_omkar/scripts/security_check.py"]
    return run_cmd(cmd, cwd=BASE_DIR, env=os.environ.copy(), suite_name="security")

def run_suite_perf() -> SuiteResult:
    cmd = [sys.executable, "integration_omkar/scripts/perf_benchmark.py"]
    return run_cmd(cmd, cwd=BASE_DIR, env=os.environ.copy(), suite_name="perf")

def run_suite_smoke(base_url: str = "http://localhost:8001") -> SuiteResult:
    cmd = [sys.executable, "integration_omkar/scripts/smoke_test.py", "--base-url", base_url]
    return run_cmd(cmd, cwd=BASE_DIR, env=os.environ.copy(), suite_name="smoke")

def print_summary_table(results: list[SuiteResult]):
    print("\n" + "=" * 78)
    print(" " * 24 + "SWIPEX TEST SUITE EXECUTION SUMMARY")
    print("=" * 78)
    print(f"{'SUITE':<22} | {'STATUS':<8} | {'PASSED':<8} | {'FAILED':<8} | {'SKIPPED':<8} | {'TIME':<7}")
    print("-" * 78)
    total_passed = 0
    total_failed = 0
    total_skipped = 0
    total_time = 0.0

    for r in results:
        status_text = "PASS" if r.exit_code == 0 else "FAIL"
        print(f"{r.name:<22} | {status_text:<8} | {r.passed:<8} | {r.failed:<8} | {r.skipped:<8} | {r.duration:5.2f}s")
        total_passed += r.passed
        total_failed += r.failed
        total_skipped += r.skipped
        total_time += r.duration

    print("-" * 78)
    overall_status = "ALL GREEN" if total_failed == 0 else f"{total_failed} FAILED"
    print(f"{'TOTAL (' + overall_status + ')':<22} | {'':<8} | {total_passed:<8} | {total_failed:<8} | {total_skipped:<8} | {total_time:5.2f}s")
    print("=" * 78 + "\n")

def main():
    parser = argparse.ArgumentParser(description="SwipeX Cross-Platform Test Runner")
    parser.add_argument("--suite", choices=[
        "all", "ci", "backend", "aiml", "data", "m3-schema", "m4",
        "integration-unit", "integration-live", "frontend", "flake8", "render-config",
        "security", "perf", "smoke"
    ], default="all", help="Target test suite to run")
    parser.add_argument("--no-docker", action="store_true", help="Skip live container integration tests")
    parser.add_argument("--base-url", default="http://localhost:8001", help="Base URL for live/smoke tests")
    args = parser.parse_args()

    results: list[SuiteResult] = []

    suite_map = {
        "flake8": run_suite_flake8,
        "render-config": run_suite_render_config,
        "frontend": run_suite_frontend,
        "backend": run_suite_backend,
        "aiml": run_suite_aiml,
        "m3-schema": run_suite_m3_schema,
        "m4": run_suite_m4,
        "integration-unit": run_suite_integration_unit,
        "data": run_suite_data,
        "integration-live": run_suite_integration_live,
        "security": run_suite_security,
        "perf": run_suite_perf,
        "smoke": lambda: run_suite_smoke(args.base_url),
    }

    if args.suite in suite_map:
        results.append(suite_map[args.suite]())
    elif args.suite in ("ci", "all"):
        # Run static and unit suites
        results.append(run_suite_flake8())
        results.append(run_suite_render_config())
        results.append(run_suite_frontend())
        results.append(run_suite_backend())
        results.append(run_suite_aiml())
        results.append(run_suite_m3_schema())
        results.append(run_suite_m4())
        results.append(run_suite_integration_unit())

        if not args.no_docker and args.suite == "all":
            results.append(run_suite_integration_live())
            results.append(run_suite_security())
            results.append(run_suite_perf())

    print_summary_table(results)

    # Exit non-zero if any suite failed
    any_failed = any(r.exit_code != 0 for r in results)
    sys.exit(1 if any_failed else 0)

if __name__ == "__main__":
    main()
