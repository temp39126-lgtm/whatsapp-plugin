#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$ROOT/deploy"
ENV_FILE="$DEPLOY_DIR/.env"

echo "============================================"
echo "  WhatsApp CRM — Production Deploy"
echo "============================================"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed." >&2
  echo "Install: https://docs.docker.com/engine/install/" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No deploy/.env found. Generating secrets..."
  bash "$ROOT/scripts/generate-deploy-secrets.sh"
  echo ""
  echo "IMPORTANT: Edit deploy/.env and set your DOMAIN, then run this script again."
  exit 0
fi

# shellcheck disable=SC1091
set -a
source "$ENV_FILE"
set +a

if [[ "$DOMAIN" == "crm.yourcompany.com" ]] || [[ -z "$DOMAIN" ]]; then
  echo "ERROR: Set your real DOMAIN in deploy/.env before deploying." >&2
  exit 1
fi

if [[ ${#ENCRYPTION_KEY} -lt 64 ]]; then
  echo "ERROR: ENCRYPTION_KEY must be at least 64 characters in deploy/.env" >&2
  exit 1
fi

export APP_URL="https://${DOMAIN}"

echo "Domain:  $DOMAIN"
echo "App URL: $APP_URL"
echo ""
echo "Make sure DNS A record for $DOMAIN points to this server's public IP."
read -r -p "Continue? (y/N) " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "==> Building and starting containers (first run may take 5–10 minutes)..."
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

echo ""
echo "==> Waiting for services to become healthy..."
sleep 15

if curl -sf "https://$DOMAIN/api/health" >/dev/null 2>&1 || curl -sf "http://$DOMAIN/api/health" >/dev/null 2>&1; then
  echo "Health check OK"
else
  echo "Note: HTTPS may take a minute while Caddy obtains SSL certificate."
  echo "Check logs: cd deploy && docker compose -f docker-compose.prod.yml logs -f"
fi

echo ""
echo "============================================"
echo "  Deployment complete"
echo "============================================"
echo ""
echo "  Web app:  https://$DOMAIN/whatsapp/inbox"
echo "  API:      https://$DOMAIN/api/health"
echo "  Webhook:  https://$DOMAIN/api/whatsapp/webhook"
echo ""
echo "  Admin login:"
echo "    Email:    $ADMIN_EMAIL"
echo "    Password: (see ADMIN_PASSWORD in deploy/.env)"
echo ""
echo "  Android APK — set in mobile/.env:"
echo "    CAPACITOR_SERVER_URL=https://$DOMAIN"
echo "    Then: cd mobile && bash scripts/build-release.sh"
echo ""
echo "  Meta webhook callback URL:"
echo "    https://$DOMAIN/api/whatsapp/webhook"
echo "    Verify token: $META_VERIFY_TOKEN"
echo ""
echo "  Useful commands:"
echo "    Logs:    cd deploy && docker compose -f docker-compose.prod.yml logs -f"
echo "    Restart: cd deploy && docker compose -f docker-compose.prod.yml restart"
echo "    Stop:    cd deploy && docker compose -f docker-compose.prod.yml down"
echo "============================================"
