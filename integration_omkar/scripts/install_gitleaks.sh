#!/usr/bin/env bash
# ==============================================================================
# SwipeX Milestone 4 — Pinned Gitleaks CLI Installer & Checksum Verifier
# Owned by: Intern 5 (Omkar — Platform, Testing & Deployment / Integrator)
# ==============================================================================
set -euo pipefail

GITLEAKS_VERSION="${GITLEAKS_VERSION:-8.24.3}"
TARBALL="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
CHECKSUMS="gitleaks_${GITLEAKS_VERSION}_checksums.txt"
BASE_URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}"
INSTALL_DIR="${TARGET_DIR:-/usr/local/bin}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

cd "${WORK_DIR}"

echo "Downloading Gitleaks v${GITLEAKS_VERSION} assets from ${BASE_URL}..."
curl -fsSL --retry 3 --retry-delay 2 -O "${BASE_URL}/${TARBALL}"
curl -fsSL --retry 3 --retry-delay 2 -O "${BASE_URL}/${CHECKSUMS}"

echo "Extracting official sha256 checksum for ${TARBALL}..."
grep " ${TARBALL}\$" "${CHECKSUMS}" > expected.sha256
test -s expected.sha256

if [ "${CORRUPT_CHECKSUM_FOR_TEST:-0}" = "1" ]; then
    echo "Simulating corrupted checksum for negative test validation..."
    echo "0000000000000000000000000000000000000000000000000000000000000000  ${TARBALL}" > expected.sha256
fi

echo "Verifying sha256 checksum..."
sha256sum -c expected.sha256

echo "Extracting binary..."
tar -xzf "${TARBALL}" gitleaks

# Install binary
BIN_DEST=""
if [ -n "${RUNNER_TEMP:-}" ] && [ -n "${GITHUB_PATH:-}" ]; then
    TARGET_BIN="${RUNNER_TEMP}/bin"
    mkdir -p "${TARGET_BIN}"
    mv gitleaks "${TARGET_BIN}/gitleaks"
    echo "${TARGET_BIN}" >> "${GITHUB_PATH}"
    export PATH="${TARGET_BIN}:${PATH}"
    BIN_DEST="${TARGET_BIN}/gitleaks"
elif [ -w "${INSTALL_DIR}" ]; then
    mkdir -p "${INSTALL_DIR}" 2>/dev/null || true
    mv gitleaks "${INSTALL_DIR}/gitleaks"
    BIN_DEST="${INSTALL_DIR}/gitleaks"
elif command -v sudo &>/dev/null && sudo -n true 2>/dev/null; then
    sudo mkdir -p "${INSTALL_DIR}"
    sudo mv gitleaks "${INSTALL_DIR}/gitleaks"
    BIN_DEST="${INSTALL_DIR}/gitleaks"
else
    TARGET_BIN="${HOME}/.local/bin"
    mkdir -p "${TARGET_BIN}"
    mv gitleaks "${TARGET_BIN}/gitleaks"
    export PATH="${TARGET_BIN}:${PATH}"
    BIN_DEST="${TARGET_BIN}/gitleaks"
fi

chmod +x "${BIN_DEST}"

# On Linux, verify the binary execution
if [ "$(uname -s)" = "Linux" ]; then
    echo "Verifying installed gitleaks version..."
    INSTALLED_VERSION="$("${BIN_DEST}" version)"
    echo "Installed version: ${INSTALLED_VERSION}"

    if [ "${INSTALLED_VERSION}" != "${GITLEAKS_VERSION}" ]; then
        echo "ERROR: Expected gitleaks version ${GITLEAKS_VERSION}, got ${INSTALLED_VERSION}" >&2
        exit 1
    fi
else
    echo "Extracted Linux ELF binary gitleaks (v${GITLEAKS_VERSION}) verified via sha256 on non-Linux host."
fi

echo "Gitleaks v${GITLEAKS_VERSION} verified and installed successfully at ${BIN_DEST}."
