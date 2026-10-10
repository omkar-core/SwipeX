# install_ci_deps.ps1 - Shared PowerShell dependency installer with constraints
# Owned by Intern 5 (Platform, Testing & Deployment).
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$Constraints = Join-Path $RepoRoot "integration_omkar\ci\constraints.txt"

Write-Host "=== Installing SwipeX Dependencies with Constraints ===" -ForegroundColor Cyan
Write-Host "Repo root:   $RepoRoot"
Write-Host "Constraints: $Constraints"

python -m pip install --upgrade pip

pip install -c "$Constraints" `
    -r (Join-Path $RepoRoot "backend_mansi\requirements.txt") `
    -r (Join-Path $RepoRoot "data_hanith\requirements.txt") `
    -r (Join-Path $RepoRoot "aiml_hemalatha\requirements.txt") `
    -r (Join-Path $RepoRoot "integration_omkar\requirements.txt") `
    -r (Join-Path $RepoRoot "integration_omkar\requirements-prod.txt") `
    flake8 pyyaml pytest-timeout pytest-asyncio

Write-Host "=== Dependencies Installed Successfully ===" -ForegroundColor Green
