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
  echo "ERROR: Set CAPACITOR_SERVER_URL in mobile/.env to your HTTPS CRM URL." >&2
  echo "Example: CAPACITOR_SERVER_URL=https://your-domain.example.com" >&2
  exit 1
fi

echo "==> Using server URL: $CAPACITOR_SERVER_URL"

if [[ ! -f android/keystore.properties ]]; then
  echo "==> Generating release keystore (first run only)"
  bash scripts/generate-keystore.sh
fi

echo "==> Syncing Capacitor Android project"
export CAPACITOR_SERVER_URL
npx cap sync android

echo "==> Building signed release APK and AAB (Play Store bundle)"
cd android
chmod +x gradlew
./gradlew assembleRelease bundleRelease

APK="app/build/outputs/apk/release/app-release.apk"
AAB="app/build/outputs/bundle/release/app-release.aab"

echo ""
echo "============================================"
echo "  Release APK: $ROOT/android/$APK"
echo "  Play Store AAB: $ROOT/android/$AAB"
echo "  Package: app.whatsappcrm"
echo "============================================"
echo "Upload the .aab file to Google Play Console."
