#!/usr/bin/env bash
# Rebuild and restart the app WITHOUT restarting cloudflared — keeps the same trycloudflare URLs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TUNNEL_STATE_FILE="${TUNNEL_STATE_FILE:-/tmp/crm-tunnel-urls.env}"

if [[ ! -f "$TUNNEL_STATE_FILE" ]]; then
  echo "No saved tunnel URLs at $TUNNEL_STATE_FILE" >&2
  echo "Run bash scripts/tunnel.sh once first." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$TUNNEL_STATE_FILE"

if [[ -z "${FRONTEND_URL:-}" || -z "${BACKEND_URL:-}" ]]; then
  echo "Invalid tunnel state file (missing FRONTEND_URL or BACKEND_URL)." >&2
  exit 1
fi

if ! pgrep -f "cloudflared tunnel --url http://127.0.0.1:3000" >/dev/null; then
  echo "Frontend cloudflared is not running. Start tunnels again: bash scripts/tunnel.sh" >&2
  exit 1
fi

if ! pgrep -f "cloudflared tunnel --url http://127.0.0.1:5000" >/dev/null; then
  echo "Backend cloudflared is not running. Start tunnels again: bash scripts/tunnel.sh" >&2
  exit 1
fi

echo "==> Rebuilding frontend (API: $BACKEND_URL)"
cd "$ROOT/frontend"
pkill -f "/tmp/whatsapp-crm-frontend/server.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
else
  while read -r pid; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done < <(lsof -t -iTCP:3000 -sTCP:LISTEN 2>/dev/null || true)
fi
sleep 2

NEXT_PUBLIC_API_URL="$BACKEND_URL" NEXT_PUBLIC_SOCKET_URL="$BACKEND_URL" npm run build
STANDALONE_DIR=".next/standalone/frontend"
DEPLOY_DIR="/tmp/whatsapp-crm-frontend"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
cp -a "$STANDALONE_DIR/." "$DEPLOY_DIR/"
mkdir -p "$DEPLOY_DIR/.next"
cp -r .next/static "$DEPLOY_DIR/.next/static"
mkdir -p "$DEPLOY_DIR/public"
cp -r public/. "$DEPLOY_DIR/public/" 2>/dev/null || true
(cd "$DEPLOY_DIR" && PORT=3000 HOSTNAME=0.0.0.0 node server.js > /tmp/next-prod.log 2>&1 &)
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:3000/whatsapp/templates" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! curl -sf "http://127.0.0.1:3000/whatsapp/templates" >/dev/null 2>&1; then
  echo "ERROR: Production frontend failed to start on port 3000" >&2
  tail -30 /tmp/next-prod.log >&2 || true
  exit 1
fi

echo "==> Restarting backend"
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
sleep 2
(cd "$ROOT/backend" && AUTH_COOKIE_CROSS_SITE=true FRONTEND_URL="$FRONTEND_URL" CORS_ORIGIN="$FRONTEND_URL,http://localhost:3000" CALLING_ENABLED=true npm run dev > /tmp/backend-dev.log 2>&1 &)
sleep 5

echo ""
echo "============================================"
echo "  Same App URL: $FRONTEND_URL/whatsapp/inbox"
echo "  Same Backend: $BACKEND_URL"
echo "============================================"
