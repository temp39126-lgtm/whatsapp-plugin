# Deploy WhatsApp CRM

This guide covers the **tech stack** and how to **run this app in production**.

The recommended path is **one Linux VPS + Docker Compose**. The repo already includes production Dockerfiles, Caddy (HTTPS), MongoDB, and MinIO.

Related files:

- `scripts/deploy-production.sh` — one-command production deploy
- `scripts/generate-deploy-secrets.sh` — generates `deploy/.env`
- `deploy/docker-compose.prod.yml` — production services
- `deploy/.env.production.example` — env template
- `deploy/HOSTING.md` — extra hosting notes
- `deploy/SECURITY.md` — security controls

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query, Socket.IO client |
| Backend | Node.js 20, Express, TypeScript, Zod, Helmet, JWT / local auth (email + password + OTP) |
| Realtime | Socket.IO |
| Database | MongoDB 7 (Mongoose) |
| Media | S3-compatible storage (MinIO in Docker, or AWS S3) |
| WhatsApp | Meta WhatsApp Cloud API + Graph webhooks |
| Email (optional) | SMTP via Nodemailer (OTP / password reset) |
| Reverse proxy | Caddy 2 (automatic HTTPS / Let’s Encrypt) |
| Containers | Docker + Docker Compose v2 |

**Default ports (local):** frontend `3000`, backend `5000`, MongoDB `27017`, MinIO `9000`.

**Production:** everything is behind Caddy on **80 / 443** for a single domain.

```
Browser / Meta webhook
        │
        ▼
   Caddy (HTTPS)
   ├─ /api/*  and /socket.io/*  → Express :5000
   └─ everything else           → Next.js :3000
                │
        ┌───────┴────────┐
        ▼                ▼
     MongoDB 7         MinIO (S3)
```

---

## What you need

1. A **VPS** — Ubuntu 22.04 or 24.04, **2+ vCPU, 4 GB RAM** recommended (2 GB is the minimum).
2. A **domain** — e.g. `crm.yourcompany.com`.
3. **DNS A record** — domain → VPS public IP.
4. **Docker Engine + Compose v2** on the VPS.
5. **Ports 80 and 443** open (and 22 for SSH).
6. A **Meta WhatsApp Cloud API** app (can be configured after the site is up).

---

## Production deploy (recommended)

### 1. Point DNS

| Type | Name | Value |
|------|------|--------|
| A | `crm` (or `@`) | your VPS public IP |

Wait until `dig crm.yourcompany.com` returns that IP **before** you deploy, or Caddy cannot issue a certificate.

### 2. Install Docker (Ubuntu)

```bash
ssh root@YOUR_VPS_IP
curl -fsSL https://get.docker.com | sh
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

### 3. Clone and generate secrets

```bash
git clone https://github.com/YOUR_ORG/whatsapp-plugin.git
cd whatsapp-plugin
bash scripts/generate-deploy-secrets.sh
```

This writes `deploy/.env`. **Save the printed passwords**, especially `ADMIN_PASSWORD`.

### 4. Edit `deploy/.env`

Set at least:

```env
DOMAIN=crm.yourcompany.com
ADMIN_EMAIL=you@yourcompany.com
ADMIN_PASSWORD=your-strong-admin-password
```

Also set Meta values (required for `NODE_ENV=production` on the backend):

```env
META_VERIFY_TOKEN=long-random-token
META_APP_SECRET=your-meta-app-secret
```

`generate-deploy-secrets.sh` already creates a random `META_VERIFY_TOKEN`. Copy **App Secret** from [Meta for Developers](https://developers.facebook.com/) → your app → Settings → Basic.

Change MinIO credentials away from `minioadmin` (production rejects the default):

```env
MINIO_ROOT_USER=crmmedia
MINIO_ROOT_PASSWORD=use-the-generated-strong-password
```

Do **not** set `AUTH_ADAPTER=mock` in production. Leave it unset (defaults to `local`) or set `AUTH_ADAPTER=local`.

### 5. Start the stack

```bash
bash scripts/deploy-production.sh
```

Or:

```bash
npm run deploy:production
```

First build takes several minutes. Caddy requests a Let’s Encrypt certificate automatically.

### 6. Open the app

| | URL |
|--|-----|
| Homepage / login | `https://YOUR-DOMAIN/` |
| Login (Admin / User) | `https://YOUR-DOMAIN/auth/login` |
| Inbox (after login) | `https://YOUR-DOMAIN/whatsapp/inbox` |
| API health | `https://YOUR-DOMAIN/api/health` |
| Meta webhook | `https://YOUR-DOMAIN/api/whatsapp/webhook` |

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `deploy/.env`.

On the login screen choose **Admin** or **User** to match the account.

---

## Environment variables

### `deploy/.env` (production Compose)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DOMAIN` | yes | Hostname only, no `https://` |
| `APP_URL` | set by script | `https://$DOMAIN` — CORS, frontend, cookies |
| `JWT_SECRET` | yes | ≥ 32 chars; used for sessions |
| `ENCRYPTION_KEY` | yes | 64 hex chars; encrypts WhatsApp tokens at rest |
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | yes | MongoDB auth |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | yes | Media storage (not `minioadmin`) |
| `S3_BUCKET` | yes | Default `whatsapp-crm-media` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | yes | First admin user (seed on start) |
| `META_VERIFY_TOKEN` | yes | Webhook verify token (≥ 16 chars) |
| `META_APP_SECRET` | yes in production | Meta app secret (≥ 16 chars) |
| `CALLING_ENABLED` | no | `true` / `false` |

Optional SMTP (password reset / email OTP):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@yourcompany.com
```

If these are not in `docker-compose.prod.yml` yet, add them under the `backend` `environment:` block, then recreate the backend container.

### Frontend (baked in at **build** time)

Compose passes:

- `NEXT_PUBLIC_API_URL=${APP_URL}`
- `NEXT_PUBLIC_SOCKET_URL=${APP_URL}`

If the public URL changes, **rebuild the frontend** (`docker compose ... up -d --build`). Changing runtime env is not enough.

---

## Meta WhatsApp after deploy

1. In the CRM: **Settings → Meta Cloud API** (admin).
2. Save:
   - Phone number ID
   - WABA (business account) ID
   - Display number
   - Access token
3. In Meta Developer Dashboard → app → **WhatsApp → Configuration**:
   - **Callback URL:** `https://YOUR-DOMAIN/api/whatsapp/webhook`
   - **Verify token:** `META_VERIFY_TOKEN` from `deploy/.env`
   - Subscribe to **`messages`**
4. If Business Suite shows the number as **Pending**, register it with Meta’s registration API (6-digit two-step PIN from WhatsApp Business on that phone):

```bash
curl -X POST "https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/register" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","pin":"123456"}'
```

Do not paste access tokens into chat or commit them.

---

## Day-2 operations

From the repo on the VPS:

```bash
cd deploy

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop
docker compose -f docker-compose.prod.yml down

# Update code
cd ..
git pull
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Data lives in Docker volumes (`mongo_data`, `minio_data`). `down` without `-v` keeps data.

---

## Local development (not production)

```bash
# MongoDB (Docker or scripts/start-mongo.sh)
docker compose up -d          # MongoDB + MinIO from root docker-compose.yml

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

npm run install:all
cd backend && npm run seed && cd ..
npm run dev                   # API :5000 + UI :3000
```

Or: `npm run start:all`.

Open `http://localhost:3000`. Demo users after seed:

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@example.com` | `admin123` |
| User | `user@example.com` | `user123` |

Temporary public demo (Cloudflare tunnel, URLs change each run):

```bash
bash scripts/tunnel.sh
```

---

## Split hosting (optional)

You can put the UI on Vercel/Netlify and the API on Railway/Render/Fly, with **MongoDB Atlas** and **AWS S3**. Then you must:

1. Serve both over **HTTPS**.
2. Set backend `CORS_ORIGIN` and `FRONTEND_URL` to the frontend origin.
3. Set `AUTH_COOKIE_CROSS_SITE=true` if the API and UI are on different sites.
4. Build the frontend with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` pointing at the API origin.
5. Put the Meta webhook on the **API** host: `https://API-HOST/api/whatsapp/webhook`.

Same-domain Compose + Caddy is simpler and is what this repo ships.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| SSL / certificate failed | DNS A record must already point at this server. `dig YOUR-DOMAIN` |
| Blank page | `docker compose -f docker-compose.prod.yml logs frontend` |
| Backend exits on start | `META_APP_SECRET`, `META_VERIFY_TOKEN`, `JWT_SECRET`, `ENCRYPTION_KEY`; MinIO user must not be `minioadmin` |
| Cannot log in | `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `deploy/.env`; choose **Admin** on the login screen |
| Webhook verify 403 | Verify token in Meta must match `META_VERIFY_TOKEN`; callback URL must be `https://YOUR-DOMAIN/api/whatsapp/webhook` |
| CORS / cookie errors | `APP_URL` / `CORS_ORIGIN` must match the URL in the browser |
| Phone still **Pending** in Meta | Register via `/register` API + WhatsApp Business two-step PIN |
| Out of memory | Use at least 4 GB RAM |

Health check:

```bash
curl -sf https://YOUR-DOMAIN/api/health
```

---

## Android (optional)

Point the Capacitor app at the same domain, then build:

```bash
cd mobile
echo "CAPACITOR_SERVER_URL=https://YOUR-DOMAIN" > .env
npm install
bash scripts/build-release.sh
```
