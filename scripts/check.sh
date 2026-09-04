#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NPM_INSTALL_FLAGS=(--no-audit --no-fund --prefer-offline)

install_deps() {
  local dir="$1"
  local name="$2"

  echo "==> Installing ${name} dependencies"
  if [[ -d "${dir}/node_modules" ]]; then
    npm install --prefix "$dir" "${NPM_INSTALL_FLAGS[@]}"
  else
    echo "    (first install — may take a few minutes)"
    npm install --prefix "$dir" --no-audit --no-fund
  fi
}

install_deps backend backend
install_deps frontend frontend

echo "==> Building backend"
npm run build --prefix backend

echo "==> Building frontend"
npm run build --prefix frontend

echo "==> Running backend tests"
npm test --prefix backend

echo ""
echo "All checks passed (install + build + test)"
