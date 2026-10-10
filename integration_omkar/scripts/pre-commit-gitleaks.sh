#!/usr/bin/env bash
# ==============================================================================
# SwipeX Milestone 4 — Pre-Commit Secret Leak Prevention Hook
# Owned by: Intern 5 (Omkar — Platform, Testing & Deployment / Integrator)
#
# Prevents accidental secret commits before git commit completes.
# Runs: gitleaks protect --staged --redact --verbose
#
# Install instructions (optional manual setup):
#   cp integration_omkar/scripts/pre-commit-gitleaks.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
# ==============================================================================

set -euo pipefail

if ! command -v gitleaks &> /dev/null; then
    echo "[WARN] Gitleaks CLI not found in PATH. Skipping pre-commit secret scan."
    echo "[INFO] Install gitleaks v8.24.3 to enable pre-commit leak protection."
    exit 0
fi

echo "=================================================================="
echo "    SWIPEX PRE-COMMIT GATE: Scanning staged files with Gitleaks   "
echo "=================================================================="

CONFIG_ARG=""
if [ -f ".gitleaks.toml" ]; then
    CONFIG_ARG="--config .gitleaks.toml"
fi

gitleaks protect --staged --redact --verbose --no-banner $CONFIG_ARG --exit-code 1

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo "=================================================================="
    echo " [ERROR] Secret detected in staged changes! Commit blocked."
    echo " Please unstage and remove the secret, or parameterize it."
    echo "=================================================================="
    exit 1
fi

echo "[SUCCESS] No leaked secrets detected in staged files. Proceeding with commit."
exit 0
