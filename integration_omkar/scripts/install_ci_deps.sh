#!/usr/bin/env bash
# install_ci_deps.sh - Shared CI/Docker dependency installer with constraints
# Owned by Intern 5 (Platform, Testing & Deployment).
# Ensures 100% version parity across CI, local dev, and container environments.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONSTRAINTS="${REPO_ROOT}/integration_omkar/ci/constraints.txt"

echo "=== Installing SwipeX Dependencies with Constraints ==="
echo "Repo root:   ${REPO_ROOT}"
echo "Constraints: ${CONSTRAINTS}"

python -m pip install --upgrade pip

pip install -c "${CONSTRAINTS}" \
    -r "${REPO_ROOT}/backend_mansi/requirements.txt" \
    -r "${REPO_ROOT}/data_hanith/requirements.txt" \
    -r "${REPO_ROOT}/aiml_hemalatha/requirements.txt" \
    -r "${REPO_ROOT}/integration_omkar/requirements.txt" \
    -r "${REPO_ROOT}/integration_omkar/requirements-prod.txt" \
    flake8 pyyaml pytest-timeout pytest-asyncio

echo "=== Dependencies Installed Successfully ==="
