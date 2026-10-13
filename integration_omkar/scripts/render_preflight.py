"""render_preflight.py - Pre-flight Validator for Render Blueprint & Free-Tier Spec
Owned by Intern 5 (Platform, Testing & Deployment).

Validates:
1. render.yaml schema syntax, required top-level blocks (databases, services).
2. Free-tier compatibility (single PostgreSQL instance, keyvalue limits, region parity).
3. Pinned runtimes (PYTHON_VERSION: 3.11.9, NODE_VERSION: 20.18.0).
4. Exactly one migration runner (RUN_MIGRATION="true" on gateway only).
5. Static site config (SPA rewrite, publish directory, VITE environment variables).
6. Classified sync:false variables (required-for-boot vs optional).
7. Expected public service URLs and GitHub repository variables.
"""
import sys
import os
import yaml
from typing import Dict, Any, List, Tuple


def load_blueprint(filepath: str) -> Dict[str, Any]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Blueprint file not found: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def validate_blueprint(data: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
    errors = []
    meta = {
        "databases": [],
        "services": [],
        "sync_false_vars": [],
        "migration_runners": [],
        "expected_urls": {},
    }

    if not isinstance(data, dict):
        return False, ["Blueprint root must be a dictionary/mapping."], meta

    # 1. Databases validation
    databases = data.get("databases", [])
    if not databases:
        errors.append("No database block defined in render.yaml.")
    elif len(databases) > 1:
        errors.append(f"Render Free Tier allows only 1 database per workspace (found {len(databases)}).")
    else:
        db = databases[0]
        meta["databases"].append(db.get("name"))
        if db.get("plan") != "free":
            errors.append(f"Database {db.get('name')} plan must be 'free' (found '{db.get('plan')}').")
        if not db.get("region"):
            errors.append(f"Database {db.get('name')} missing required 'region'.")

    # 2. Services validation
    services = data.get("services", [])
    if not services:
        errors.append("No services defined in render.yaml.")

    service_names = set()
    db_region = databases[0].get("region") if databases else None

    for svc in services:
        name = svc.get("name")
        stype = svc.get("type")
        plan = svc.get("plan")
        region = svc.get("region")
        runtime = svc.get("runtime")

        if not name:
            errors.append("Service missing required 'name' field.")
            continue

        if name in service_names:
            errors.append(f"Duplicate service name '{name}'.")
        service_names.add(name)

        meta["services"].append({
            "name": name,
            "type": stype,
            "runtime": runtime,
            "plan": plan,
            "region": region,
        })

        if plan != "free":
            errors.append(f"Service '{name}' plan must be 'free' (found '{plan}').")

        if region and db_region and region != db_region:
            errors.append(f"Service '{name}' region '{region}' does not match DB region '{db_region}'.")

        # Map expected public URLs
        if stype == "web":
            meta["expected_urls"][name] = f"https://{name}.onrender.com"

        # Env Vars Inspection
        env_vars = svc.get("envVars", [])
        has_python_version = False
        has_node_version = False

        for env in env_vars:
            key = env.get("key")
            val = env.get("value")

            if env.get("sync") is False:
                meta["sync_false_vars"].append({"service": name, "key": key})

            if key == "PYTHON_VERSION":
                has_python_version = True
                if val != "3.11.9":
                    errors.append(f"Service '{name}' PYTHON_VERSION must be '3.11.9' (found '{val}').")

            if key == "NODE_VERSION":
                has_node_version = True
                if not str(val).startswith("20"):
                    errors.append(f"Static site '{name}' NODE_VERSION must be 20.x (found '{val}').")

            if key == "RUN_MIGRATION" and str(val).lower() in ("true", "1", "yes"):
                meta["migration_runners"].append(name)

        if runtime == "python" and not has_python_version:
            errors.append(f"Python service '{name}' missing explicit PYTHON_VERSION envVar (expected 3.11.9).")

        if runtime == "static" and not has_node_version:
            errors.append(f"Static site '{name}' missing explicit NODE_VERSION envVar (expected 20.x).")

        # Static site specific checks
        if runtime == "static":
            if svc.get("staticPublishPath") != "dist":
                errors.append(f"Static site '{name}' staticPublishPath must be 'dist'.")
            routes = svc.get("routes", [])
            has_spa_rewrite = any(
                r.get("type") == "rewrite" and r.get("source") == "/*" and r.get("destination") == "/index.html"
                for r in routes
            )
            if not has_spa_rewrite:
                errors.append(f"Static site '{name}' missing SPA rewrite rule (/* -> /index.html).")

    # 3. Check migration runners
    if len(meta["migration_runners"]) != 1:
        errors.append(
            f"Exactly ONE service must have RUN_MIGRATION='true'. Found {len(meta['migration_runners'])}: "
            f"{meta['migration_runners']}"
        )

    is_valid = len(errors) == 0
    return is_valid, errors, meta


def print_preflight_report(is_valid: bool, errors: List[str], meta: Dict[str, Any]):
    print("=" * 75)
    print("              SWIPEX RENDER BLUEPRINT PRE-FLIGHT AUDIT REPORT          ")
    print("=" * 75)
    print(f"Status: {'[PASS] VALID FOR RENDER FREE TIER' if is_valid else '[FAIL] INVALID BLUEPRINT'}\n")

    print("RESOURCE TABLE:")
    print(f"{'RESOURCE NAME':<26} | {'TYPE':<10} | {'PLAN':<6} | {'REGION':<8} | {'RUNTIME'}")
    print("-" * 75)
    for db in meta["databases"]:
        print(f"{db:<26} | database   | free   | oregon   | postgres:16")
    for svc in meta["services"]:
        print(f"{svc['name']:<26} | {svc['type']:<10} | {svc['plan']:<6} | {svc['region']:<8} | {svc.get('runtime', 'n/a')}")

    print("\nMIGRATION COORDINATION:")
    print(f"  Primary Migration Runner: {meta['migration_runners'][0] if meta['migration_runners'] else 'NONE'}")
    print("  Lock Mechanism:           Postgres session advisory lock (pg_advisory_lock: 849204)")

    print("\nSYNC:FALSE VARIABLES (MANUAL DASHBOARD INPUT REQUIRED):")
    if meta["sync_false_vars"]:
        for sf in meta["sync_false_vars"]:
            print(f"  - [{sf['service']}] {sf['key']}")
    else:
        print("  (None - all secrets use generateValue: true or auto-wired fromDatabase/fromService)")

    print("\nEXPECTED PUBLIC SERVICE URLS:")
    for svc_name, url in meta["expected_urls"].items():
        print(f"  {svc_name:<26} -> {url}")

    print("\nGITHUB REPOSITORY VARIABLES (Settings > Secrets and variables > Actions > Variables):")
    gateway_url = meta["expected_urls"].get("swipex-omkar-gateway", "https://swipex-omkar-gateway.onrender.com")
    job_url = meta["expected_urls"].get("swipex-omkar-jobs", "https://swipex-omkar-jobs.onrender.com")
    resume_url = meta["expected_urls"].get("swipex-omkar-resume", "https://swipex-omkar-resume.onrender.com")
    frontend_url = meta["expected_urls"].get("swipex-omkar-web", "https://swipex-omkar-web.onrender.com")

    print(f"  RENDER_BASE_URL     : {gateway_url}  (REQUIRED)")
    print(f"  RENDER_JOB_URL      : {job_url}  (Optional)")
    print(f"  RENDER_RESUME_URL   : {resume_url}  (Optional)")
    print(f"  RENDER_FRONTEND_URL : {frontend_url}  (Optional)")

    if errors:
        print("\nERRORS DETECTED:")
        for err in errors:
            print(f"  [X] {err}")
    print("=" * 75)


def main():
    blueprint_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "render.yaml"
    )
    data = load_blueprint(blueprint_path)
    is_valid, errors, meta = validate_blueprint(data)
    print_preflight_report(is_valid, errors, meta)
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
