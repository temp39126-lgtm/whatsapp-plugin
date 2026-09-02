#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
KEYSTORE="$ANDROID_DIR/release.keystore"
PROPS="$ANDROID_DIR/keystore.properties"

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore already exists: $KEYSTORE"
  exit 0
fi

STORE_PASS="${KEYSTORE_PASSWORD:-WhatsAppCRM2026!}"
KEY_PASS="${KEY_PASSWORD:-$STORE_PASS}"
ALIAS="${KEY_ALIAS:-whatsappcrm}"

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=WhatsApp CRM, OU=Mobile, O=WhatsAppCRM, L=Unknown, ST=Unknown, C=US"

cat > "$PROPS" <<EOF
storeFile=release.keystore
storePassword=$STORE_PASS
keyAlias=$ALIAS
keyPassword=$KEY_PASS
EOF

echo "Created release keystore: $KEYSTORE"
echo "Created signing config: $PROPS"
echo ""
echo "IMPORTANT: Back up release.keystore and keystore.properties securely."
echo "Google Play requires the same signing key for all future updates."
