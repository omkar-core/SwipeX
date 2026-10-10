# ==============================================================================
# SwipeX Milestone 4 — Pre-Commit Secret Leak Prevention Hook (PowerShell)
# Owned by: Intern 5 (Omkar — Platform, Testing & Deployment / Integrator)
#
# Prevents accidental secret commits before git commit completes.
# Runs: gitleaks protect --staged --redact --verbose
#
# Install instructions (optional manual setup for Windows git):
#   Set up a wrapper in .git/hooks/pre-commit:
#     powershell -ExecutionPolicy Bypass -File integration_omkar/scripts/pre-commit-gitleaks.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"

$gitleaksCmd = Get-Command gitleaks -ErrorAction SilentlyContinue

if (-not $gitleaksCmd) {
    Write-Host "[WARN] Gitleaks CLI not found in PATH. Skipping pre-commit secret scan." -ForegroundColor Yellow
    Write-Host "[INFO] Download gitleaks v8.24.3 to enable pre-commit leak protection." -ForegroundColor Gray
    exit 0
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "    SWIPEX PRE-COMMIT GATE: Scanning staged files with Gitleaks   " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$configArg = @()
if (Test-Path ".gitleaks.toml") {
    $configArg = @("--config", ".gitleaks.toml")
}

& gitleaks protect --staged --redact --verbose --no-banner @configArg --exit-code 1

if ($LASTEXITCODE -ne 0) {
    Write-Host "==================================================================" -ForegroundColor Red
    Write-Host " [ERROR] Secret detected in staged changes! Commit blocked." -ForegroundColor Red
    Write-Host " Please unstage and remove the secret, or parameterize it." -ForegroundColor Red
    Write-Host "==================================================================" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] No leaked secrets detected in staged files. Proceeding with commit." -ForegroundColor Green
exit 0
