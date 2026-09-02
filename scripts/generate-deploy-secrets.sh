#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy/.env"

JWT=$(openssl rand -hex 32)
ENC=$(openssl rand -hex 32)
MONGO_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
MINIO_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
ADMIN_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)

echo "Generated secrets (save these securely):"
echo ""
echo "JWT_SECRET=$JWT"
echo "ENCRYPTION_KEY=$ENC"
echo "MONGO_ROOT_PASSWORD=$MONGO_PASS"
echo "MINIO_ROOT_PASSWORD=$MINIO_PASS"
echo "ADMIN_PASSWORD=$ADMIN_PASS"
echo ""

if [[ -f "$ENV_FILE" ]]; then
  echo "Updating deploy/.env (preserving DOMAIN and ADMIN_EMAIL if set)..."
  # shellcheck disable=SC1091
  source "$ENV_FILE" 2>/dev/null || true
fi

DOMAIN="${DOMAIN:-crm.yourcompany.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@yourcompany.com}"

cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
APP_URL=https://$DOMAIN

JWT_SECRET=$JWT
ENCRYPTION_KEY=$ENC

MONGO_ROOT_USER=whatsappcrm
MONGO_ROOT_PASSWORD=$MONGO_PASS

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MINIO_PASS
S3_BUCKET=whatsapp-crm-media

ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASS

META_VERIFY_TOKEN=$(openssl rand -hex 16)
CALLING_ENABLED=true
EOF

echo ""
echo "Wrote $ENV_FILE"
echo "Edit DOMAIN and ADMIN_EMAIL if needed, then run: bash scripts/deploy-production.sh"
