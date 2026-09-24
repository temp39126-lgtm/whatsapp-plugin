#!/usr/bin/env bash
# Deploy WhatsApp CRM with ngrok (separate config from your other ngrok sites).
#
# Stable URLs: reserve two domains in ngrok dashboard, set NGROK_CRM_*_DOMAIN below.
# Does NOT modify ~/.config/ngrok/ngrok.yml — uses repo-local .ngrok-crm.yml only.
#
# Usage:
#   cp scripts/ngrok-crm.env.example scripts/ngrok-crm.env   # fill in token + domains
#   bash scripts/ngrok.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/scripts/ngrok-crm.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

NGROK_BIN="${NGROK_BIN:-ngrok}"
NGROK_CONFIG="$ROOT/.ngrok-crm.yml"
NGROK_LOG="/tmp/ngrok-crm.log"
NGROK_API="http://127.0.0.1:4040"

if [[ -z "${NGROK_AUTHTOKEN:-}" ]]; then
  echo "ERROR: Set NGROK_AUTHTOKEN in scripts/ngrok-crm.env (from https://dashboard.ngrok.com/get-started/your-authtoken)" >&2
  exit 1
fi

if ! command -v "$NGROK_BIN" >/dev/null 2>&1; then
  echo "ERROR: ngrok not installed. Install from https://ngrok.com/download" >&2
  exit 1
fi

echo "==> Ensuring MongoDB is running"
bash scripts/start-mongo.sh || true

if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
fi

echo "==> Seeding default users and demo data"
(cd backend && npm run seed) || true

echo "==> Starting backend on :5000"
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
sleep 1
(cd backend && AUTH_COOKIE_CROSS_SITE=true CALLING_ENABLED=true npm run dev > /tmp/backend-dev.log 2>&1 &)
sleep 3

wait_for_port() {
  local port="$1"
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${port}/" >/dev/null 2>&1 || curl -sf "http://127.0.0.1:${port}/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

stop_crm_ngrok() {
  pkill -f "ngrok start --config ${NGROK_CONFIG}" 2>/dev/null || true
  pkill -f "ngrok start crm-backend" 2>/dev/null || true
  pkill -f "ngrok start crm-frontend" 2>/dev/null || true
  pkill -f "ngrok start crm-backend-temp" 2>/dev/null || true
}

write_single_endpoint_config() {
  local name="$1"
  local port="$2"
  local domain="${3:-}"
  local url_line
  if [[ -n "$domain" ]]; then
    url_line="    url: https://${domain}"
  else
    url_line="    url: https://"
  fi
  cat >"$NGROK_CONFIG" <<EOF
version: 3
agent:
  authtoken: ${NGROK_AUTHTOKEN}
endpoints:
  - name: ${name}
${url_line}
    upstream:
      url: ${port}
EOF
}

resolve_backend_url() {
  if [[ -n "${NGROK_CRM_BACKEND_DOMAIN:-}" ]]; then
    echo "https://${NGROK_CRM_BACKEND_DOMAIN}"
    return
  fi
  echo "==> No NGROK_CRM_BACKEND_DOMAIN — starting temporary ngrok for :5000 to discover URL" >&2
  stop_crm_ngrok
  write_single_endpoint_config "crm-backend-temp" 5000 ""
  "$NGROK_BIN" start --config "$NGROK_CONFIG" crm-backend-temp --log=stdout > /tmp/ngrok-crm-temp.log 2>&1 &
  for _ in $(seq 1 30); do
    if curl -sf "$NGROK_API/api/tunnels" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  local url
  url=$(curl -sf "$NGROK_API/api/tunnels" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      const j=JSON.parse(d);
      const list=j.tunnels||[];
      const u=(list.find(t=>t.public_url&&t.public_url.startsWith('https'))||{}).public_url;
      if(u) console.log(u); else process.exit(1);
    });
  " 2>/dev/null || true)
  if [[ -z "$url" ]]; then
    echo "ERROR: Could not read ngrok backend URL from $NGROK_API (set NGROK_CRM_BACKEND_DOMAIN for stable URLs)" >&2
    tail -20 /tmp/ngrok-crm-temp.log >&2 || true
    exit 1
  fi
  stop_crm_ngrok
  sleep 2
  echo "$url"
}

write_ngrok_config() {
  local backend_name="$1"
  local backend_port="$2"
  local backend_domain="$3"
  local frontend_name="${4:-crm-frontend}"
  local frontend_port="${5:-3000}"
  local frontend_domain="${6:-}"

  local backend_url_line frontend_url_line
  if [[ -n "$backend_domain" ]]; then
    backend_url_line="    url: https://${backend_domain}"
  else
    backend_url_line="    url: https://"
  fi
  if [[ -n "$frontend_domain" ]]; then
    frontend_url_line="    url: https://${frontend_domain}"
  else
    frontend_url_line="    url: https://"
  fi

  cat >"$NGROK_CONFIG" <<EOF
version: 3
agent:
  authtoken: ${NGROK_AUTHTOKEN}
endpoints:
  - name: ${backend_name}
${backend_url_line}
    upstream:
      url: ${backend_port}
  - name: ${frontend_name}
${frontend_url_line}
    upstream:
      url: ${frontend_port}
EOF
}

BACKEND_URL=$(resolve_backend_url)
echo "Backend URL: $BACKEND_URL"

echo "==> Building frontend for production"
pkill -f "next-server" 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 2
cd frontend
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
if ! wait_for_port 3000; then
  echo "ERROR: Frontend failed to start on :3000" >&2
  tail -30 /tmp/next-prod.log >&2 || true
  exit 1
fi

if [[ -n "${NGROK_CRM_FRONTEND_DOMAIN:-}" ]]; then
  FRONTEND_URL="https://${NGROK_CRM_FRONTEND_DOMAIN}"
else
  FRONTEND_URL=""
fi

write_ngrok_config "crm-backend" 5000 "${NGROK_CRM_BACKEND_DOMAIN:-}" "crm-frontend" 3000 "${NGROK_CRM_FRONTEND_DOMAIN:-}"

echo "==> Starting ngrok (config: .ngrok-crm.yml — separate from other ngrok projects)"
pkill -f "ngrok start --config $NGROK_CONFIG" 2>/dev/null || true
pkill -f "ngrok start crm-backend" 2>/dev/null || true
sleep 1
"$NGROK_BIN" start --config "$NGROK_CONFIG" crm-backend crm-frontend >"$NGROK_LOG" 2>&1 &
for _ in $(seq 1 30); do
  if curl -sf "$NGROK_API/api/tunnels" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if [[ -z "$FRONTEND_URL" ]]; then
  FRONTEND_URL=$(curl -sf "$NGROK_API/api/tunnels" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      const j=JSON.parse(d);
      const list=j.tunnels||[];
      const front=list.find(t=>String(t.public_url||'').includes('3000')||(t.name||'').includes('frontend'));
      const anyHttps=list.map(t=>t.public_url).filter(u=>u&&u.startsWith('https'));
      const u=(front&&front.public_url)||anyHttps.find(u=>u!==process.env.BACK)||anyHttps[1]||anyHttps[0];
      if(u) console.log(u); else process.exit(1);
    });
  " BACK="$BACKEND_URL" 2>/dev/null || true)
fi

if [[ -z "${NGROK_CRM_BACKEND_DOMAIN:-}" ]]; then
  BACKEND_URL=$(curl -sf "$NGROK_API/api/tunnels" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      const j=JSON.parse(d);
      const list=j.tunnels||[];
      const back=list.find(t=>(t.name||'').includes('backend'))||list[0];
      const u=back&&back.public_url;
      if(u) console.log(u); else process.exit(1);
    });
  " 2>/dev/null || echo "$BACKEND_URL")
fi

if [[ -z "$FRONTEND_URL" ]]; then
  echo "ERROR: Could not determine frontend ngrok URL. Set NGROK_CRM_FRONTEND_DOMAIN." >&2
  tail -30 "$NGROK_LOG" >&2
  exit 1
fi

echo "==> Restarting backend with CORS for $FRONTEND_URL"
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
sleep 2
(cd "$ROOT/backend" && AUTH_COOKIE_CROSS_SITE=true FRONTEND_URL="$FRONTEND_URL" CORS_ORIGIN="$FRONTEND_URL,http://localhost:3000" CALLING_ENABLED=true npm run dev > /tmp/backend-dev.log 2>&1 &)
sleep 4

echo ""
echo "============================================"
echo "  App:     $FRONTEND_URL/whatsapp/inbox"
echo "  Login:   $FRONTEND_URL/auth/login"
echo "  Backend: $BACKEND_URL"
echo "  Webhook: $BACKEND_URL/api/whatsapp/webhook"
echo "============================================"
if [[ -z "${NGROK_CRM_FRONTEND_DOMAIN:-}" || -z "${NGROK_CRM_BACKEND_DOMAIN:-}" ]]; then
  echo "Tip: Reserve two domains in ngrok dashboard and set NGROK_CRM_*_DOMAIN in scripts/ngrok-crm.env for stable URLs."
fi
echo "ngrok log: $NGROK_LOG"
echo "Other ngrok sites: keep using ~/.config/ngrok/ngrok.yml — this CRM uses .ngrok-crm.yml only."
