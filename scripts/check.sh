#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing backend dependencies"
npm install --prefix backend

echo "==> Installing frontend dependencies"
npm install --prefix frontend

echo "==> Building backend"
npm run build --prefix backend

echo "==> Building frontend"
npm run build --prefix frontend

echo "==> Running backend tests"
npm test --prefix backend

echo ""
echo "All checks passed (install + build + test)"
