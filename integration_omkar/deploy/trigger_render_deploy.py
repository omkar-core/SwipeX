"""
trigger_render_deploy.py - Render Webhook Deploy Trigger
Owned by Intern 5 (Platform, Testing & Deployment).

Triggers automated re-deployment of Render services via Deploy Hooks.
Configured via GitHub Secrets:
  - RENDER_DEPLOY_HOOK_GATEWAY
  - RENDER_DEPLOY_HOOK_JOB
  - RENDER_DEPLOY_HOOK_RESUME
  - RENDER_DEPLOY_HOOK_FRONTEND
"""
import os
import sys
import urllib.request
import urllib.error

def trigger_hook(service_name: str, hook_url: str) -> bool:
    if not hook_url or not hook_url.startswith("https://api.render.com/deploy/"):
        print(f"[DEPLOY] Skipping {service_name}: Invalid or empty hook URL.")
        return False

    print(f"[DEPLOY] Triggering deploy hook for {service_name}...")
    try:
        req = urllib.request.Request(hook_url, data=b"", headers={"User-Agent": "SwipeX-CI/1.0"}, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status in (200, 201, 202):
                print(f"[DEPLOY] SUCCESS: {service_name} deploy triggered (HTTP {resp.status}).")
                return True
            else:
                print(f"[DEPLOY] WARNING: {service_name} returned HTTP {resp.status}.")
                return False
    except Exception as e:
        print(f"[DEPLOY] ERROR triggering {service_name}: {e}")
        return False

def main():
    hooks = {
        "auth-gateway": os.environ.get("RENDER_DEPLOY_HOOK_GATEWAY") or os.environ.get("RENDER_DEPLOY_HOOK"),
        "job-service": os.environ.get("RENDER_DEPLOY_HOOK_JOB"),
        "resume-service": os.environ.get("RENDER_DEPLOY_HOOK_RESUME"),
        "frontend": os.environ.get("RENDER_DEPLOY_HOOK_FRONTEND"),
    }

    active_hooks = {k: v for k, v in hooks.items() if v}

    if not active_hooks:
        print("\n[DEPLOY] NOTICE: No Render deploy hooks configured in GitHub Secrets.")
        print("[DEPLOY] To enable automated continuous deployment to Render:")
        print("  1. In Render Dashboard -> Service -> Settings -> Deploy Hook -> Copy URL.")
        print("  2. In GitHub Repo -> Settings -> Secrets and variables -> Actions -> Add RENDER_DEPLOY_HOOK_GATEWAY, etc.")
        print("[DEPLOY] Automated deployment trigger skipped safely.")
        sys.exit(0)

    success_count = 0
    for name, url in active_hooks.items():
        if trigger_hook(name, url):
            success_count += 1

    print(f"\n[DEPLOY] Triggered {success_count}/{len(active_hooks)} configured deploy hooks.")
    if success_count == len(active_hooks):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
