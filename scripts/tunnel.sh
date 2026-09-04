#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLOUDFLARED="${CLOUDFLARED:-/tmp/cloudflared}"
if [[ ! -x "$CLOUDFLARED" ]]; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CLOUDFLARED"
  chmod +x "$CLOUDFLARED"
fi

echo "==> Ensuring MongoDB is running"
bash scripts/start-mongo.sh || true

echo "==> Starting backend (CORS allows Cloudflare tunnels in development)"
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
sleep 1
(cd backend && AUTH_COOKIE_CROSS_SITE=true CALLING_ENABLED=true npm run dev > /tmp/backend-dev.log 2>&1 &)
sleep 3

echo "==> Starting backend Cloudflare tunnel"
pkill -f "cloudflared tunnel --url http://127.0.0.1:5000" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:5000" 2>/dev/null || true
"$CLOUDFLARED" tunnel --url http://127.0.0.1:5000 --no-autoupdate > /tmp/cf-backend.log 2>&1 &
sleep 8
extract_tunnel_url() {
  local log_file="$1"
  local pick="${2:-head}"
  local url
  url=$(strings "$log_file" 2>/dev/null | rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' | if [[ "$pick" == tail ]]; then tail -1; else head -1; fi)
  if [[ ! "$url" =~ ^https://[a-z0-9-]+\.trycloudflare\.com$ ]]; then
    echo "ERROR: Could not parse Cloudflare URL from $log_file" >&2
    strings "$log_file" 2>/dev/null | tail -20 >&2 || true
    exit 1
  fi
  echo "$url"
}

BACKEND_URL=$(extract_tunnel_url /tmp/cf-backend.log head)
echo "Backend tunnel: $BACKEND_URL"

echo "==> Building frontend for production (CSS works through tunnels)"
pkill -f "next-server" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "standalone/frontend/server.js" 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 2
if lsof -i :3000 >/dev/null 2>&1; then
  echo "ERROR: Port 3000 is still in use; cannot start production frontend" >&2
  lsof -i :3000 >&2 || true
  exit 1
fi
cd frontend
NEXT_PUBLIC_API_URL="$BACKEND_URL" NEXT_PUBLIC_SOCKET_URL="$BACKEND_URL" npm run build
STANDALONE_DIR=".next/standalone/frontend"
DEPLOY_DIR="/tmp/whatsapp-crm-frontend"
# Standalone output requires static/public beside server.js or CSS/JS return 400/404.
# Deploy to a stable path so later `npm run build` does not break a running server.
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
cp -a "$STANDALONE_DIR/." "$DEPLOY_DIR/"
mkdir -p "$DEPLOY_DIR/.next"
cp -r .next/static "$DEPLOY_DIR/.next/static"
mkdir -p "$DEPLOY_DIR/public"
cp -r public/. "$DEPLOY_DIR/public/" 2>/dev/null || true
CSS_COUNT=$(find "$DEPLOY_DIR/.next/static/css" -name '*.css' 2>/dev/null | wc -l)
if [[ "$CSS_COUNT" -lt 1 ]]; then
  echo "ERROR: Standalone static assets were not copied" >&2
  exit 1
fi
(cd "$DEPLOY_DIR" && PORT=3000 HOSTNAME=0.0.0.0 node server.js > /tmp/next-prod.log 2>&1 &)
for _ in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; then
  echo "ERROR: Production frontend failed to start on port 3000" >&2
  tail -30 /tmp/next-prod.log >&2 || true
  exit 1
fi
CSS_FILE=$(ls .next/static/css 2>/dev/null | head -1 || true)
if [[ -n "$CSS_FILE" ]]; then
  CSS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000/_next/static/css/$CSS_FILE")
  if [[ "$CSS_STATUS" != "200" ]]; then
    echo "ERROR: Frontend static CSS returned HTTP $CSS_STATUS (blank page risk)" >&2
    tail -30 /tmp/next-prod.log >&2 || true
    exit 1
  fi
fi

echo "==> Starting frontend Cloudflare tunnel"
pkill -f "cloudflared tunnel --url http://127.0.0.1:3000" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:3000" 2>/dev/null || true
"$CLOUDFLARED" tunnel --url http://127.0.0.1:3000 --no-autoupdate > /tmp/cf-frontend.log 2>&1 &
sleep 8
FRONTEND_URL=$(extract_tunnel_url /tmp/cf-frontend.log tail)
echo "Frontend tunnel: $FRONTEND_URL"

echo "==> Restarting backend with FRONTEND_URL for password reset links"
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
sleep 2
(cd "$ROOT/backend" && AUTH_COOKIE_CROSS_SITE=true FRONTEND_URL="$FRONTEND_URL" CORS_ORIGIN="$FRONTEND_URL,http://localhost:3000" CALLING_ENABLED=true npm run dev > /tmp/backend-dev.log 2>&1 &)
sleep 5

echo ""
echo "============================================"
echo "  App:     $FRONTEND_URL/whatsapp/inbox"
echo "  Backend: $BACKEND_URL"
echo "============================================"
echo "Use production mode for tunnels (not npm run dev)."
