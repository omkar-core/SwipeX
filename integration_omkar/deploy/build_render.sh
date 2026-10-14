#!/usr/bin/env bash
# build_render.sh - Production Combined Build Script for Render
# Owned by Intern 5 (Platform, Testing & Deployment).
# Builds the React frontend and installs Python backend dependencies in one build step.

set -euo pipefail

echo "=================================================================="
echo "          SWIPEX RENDER COMBINED BUILD (FRONTEND + API)           "
echo "=================================================================="

# 1. Ensure Node.js & npm exist (Install portable Node 20.18.0 if missing)
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "[BUILD] Node.js or npm not detected in PATH."
    echo "[BUILD] NOTE: Dynamic Node.js provisioning via nodeenv in Render's native Python runtime is UNPROVEN until executed on Render."
    echo "[BUILD] Installing standalone Node.js 20.18.0 via nodeenv..."
    pip install --quiet nodeenv || {
        echo "::error::CRITICAL BUILD FAILURE: Failed to install 'nodeenv' via pip."
        exit 1
    }
    nodeenv --node=20.18.0 --prebuilt .nodeenv || {
        echo "::error::CRITICAL BUILD FAILURE: nodeenv failed to download or configure Node 20.18.0."
        exit 1
    }
    export PATH="$(pwd)/.nodeenv/bin:$PATH"
fi

echo "[BUILD] Node.js version: $(node --version)"
echo "[BUILD] npm version:     $(npm --version)"

# 2. Configure Frontend Build Environment Variables
export VITE_BASE_API_URL="${VITE_BASE_API_URL:-/api/v1}"
export VITE_USE_MOCK="${VITE_USE_MOCK:-false}"
export VITE_API_URL="${VITE_API_URL:-https://swipex-bpgb.onrender.com}"
export VITE_WS_URL="${VITE_WS_URL:-wss://swipex-bpgb.onrender.com/api/v1/notifications/ws}"

echo "[BUILD] Frontend Build Configuration:"
echo "  VITE_BASE_API_URL = ${VITE_BASE_API_URL}"
echo "  VITE_USE_MOCK     = ${VITE_USE_MOCK}"
echo "  VITE_API_URL      = ${VITE_API_URL}"
echo "  VITE_WS_URL       = ${VITE_WS_URL}"

# 3. Clean Install & Build Frontend
echo "[BUILD] Installing frontend dependencies & building React client..."
(
    cd frontend_boomika
    npm ci || {
        echo "::error::CRITICAL BUILD FAILURE: 'npm ci' failed in frontend_boomika."
        exit 1
    }
    npm run build || {
        echo "::error::CRITICAL BUILD FAILURE: 'npm run build' failed in frontend_boomika."
        exit 1
    }
)

# 4. Verify dist/index.html was produced
if [ ! -f "frontend_boomika/dist/index.html" ]; then
    echo "::error::CRITICAL BUILD FAILURE: frontend_boomika/dist/index.html was not generated!"
    exit 1
fi

DIST_SIZE=$(wc -c < "frontend_boomika/dist/index.html" | tr -d ' ')
echo "[BUILD] [OK] Frontend build succeeded. dist/index.html size: ${DIST_SIZE} bytes."

# Ensure logo.svg exists in dist to prevent browser 404
if [ -f "frontend_boomika/dist/favicon.svg" ] && [ ! -f "frontend_boomika/dist/logo.svg" ]; then
    cp frontend_boomika/dist/favicon.svg frontend_boomika/dist/logo.svg || true
    echo "[BUILD] Generated dist/logo.svg from favicon.svg."
fi

# 5. Install Python Production Requirements
echo "[BUILD] Installing Python production requirements..."
pip install --upgrade pip
pip install --prefer-binary \
    -r backend_mansi/requirements.txt \
    -r data_hanith/requirements.txt \
    -r aiml_hemalatha/requirements.txt \
    -r integration_omkar/requirements-prod.txt

echo "=================================================================="
echo "          SWIPEX RENDER COMBINED BUILD COMPLETED SUCCESSFULLY     "
echo "=================================================================="
