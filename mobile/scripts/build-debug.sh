#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${CAPACITOR_SERVER_URL:-}" ]]; then
  echo "ERROR: Set CAPACITOR_SERVER_URL in mobile/.env" >&2
  exit 1
fi

export CAPACITOR_SERVER_URL
npx cap sync android

cd android
chmod +x gradlew
./gradlew assembleDebug

echo ""
echo "Debug APK: $ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
