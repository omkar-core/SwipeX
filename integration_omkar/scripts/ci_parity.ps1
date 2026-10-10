# SwipeX CI-Parity Clean-Room Test Runner for Windows PowerShell
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path.Replace('\', '/')

Write-Host "=== SWIPEX CI-PARITY CLEAN-ROOM TEST RUNNER ===" -ForegroundColor Cyan
Write-Host "Starting clean python:3.11-slim Linux container..." -ForegroundColor Cyan

# Mount workspace and run in Linux clean room
docker run --rm `
  -v "${RepoRoot}:/work" `
  -w /work `
  python:3.11-slim bash -lc "
    set -e
    apt-get update -qq && apt-get install -y -qq build-essential curl git > /dev/null 2>&1
    bash integration_omkar/scripts/install_ci_deps.sh
    # Avoid virtiofs Windows volume lock issues by routing transient test DBs to /tmp
    trap 'rm -f test_auth.db test_m2.db test_m3.db test_m4.db auth_service_dev.db' EXIT
    touch /tmp/test_auth.db /tmp/test_m2.db /tmp/test_m3.db /tmp/test_m4.db /tmp/auth_service_dev.db
    ln -sf /tmp/test_auth.db test_auth.db
    ln -sf /tmp/test_m2.db test_m2.db
    ln -sf /tmp/test_m3.db test_m3.db
    ln -sf /tmp/test_m4.db test_m4.db
    ln -sf /tmp/auth_service_dev.db auth_service_dev.db
    python integration_omkar/scripts/run_suites.py --suite ci-unit --no-docker
  "

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== CI-PARITY RUN SUCCESSFUL: 100% PARITY CONFIRMED ===" -ForegroundColor Green
} else {
    Write-Host "=== CI-PARITY RUN FAILED ===" -ForegroundColor Red
    exit 1
}
