# Production hosting — buy domain, point DNS, run one script

Everything is pre-configured. You only need:

1. A **VPS** (virtual server)
2. A **domain name**
3. **5 minutes** to run the deploy script

---

## What you get after deploy

| Service | URL |
|---------|-----|
| Web app | `https://YOUR-DOMAIN/whatsapp/inbox` |
| API | `https://YOUR-DOMAIN/api/...` |
| Meta webhook | `https://YOUR-DOMAIN/api/whatsapp/webhook` |
| Android APK | Points to `https://YOUR-DOMAIN` |

All on **one domain** with automatic HTTPS (Let's Encrypt via Caddy).

---

## Step 1 — Get a VPS

Recommended providers (pick one):

| Provider | Plan | Price |
|----------|------|-------|
| [Hetzner](https://www.hetzner.com/cloud) | CX22 (2 vCPU, 4GB RAM) | ~€4/mo |
| [DigitalOcean](https://www.digitalocean.com) | Basic 2GB | ~$12/mo |
| [AWS Lightsail](https://aws.amazon.com/lightsail/) | 2GB | ~$12/mo |
| [Vultr](https://www.vultr.com) | 2 vCPU 4GB | ~$12/mo |

**Minimum:** 2 GB RAM, Ubuntu 22.04 or 24.04

---

## Step 2 — Buy a domain

Buy from any registrar:

- [Namecheap](https://www.namecheap.com)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- [GoDaddy](https://www.godaddy.com)

Example: `crm.yourcompany.com` or `whatsapp.yourcompany.com`

---

## Step 3 — Point DNS to your server

In your domain registrar / Cloudflare DNS:

| Type | Name | Value |
|------|------|-------|
| **A** | `@` or `crm` | `YOUR_VPS_PUBLIC_IP` |

Example: `crm.yourcompany.com` → `203.0.113.50`

Wait 5–30 minutes for DNS to propagate.

---

## Step 4 — Install Docker on the VPS

SSH into your server:

```bash
ssh root@YOUR_VPS_IP
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

---

## Step 5 — Deploy the app

```bash
# Clone the project
git clone https://github.com/YOUR_ORG/whatsapp-plugin.git
cd whatsapp-plugin

# Generate secrets + config file
bash scripts/generate-deploy-secrets.sh

# Edit your domain and admin email
nano deploy/.env
```

Set these in `deploy/.env`:

```env
DOMAIN=crm.yourcompany.com
ADMIN_EMAIL=you@yourcompany.com
```

Save passwords shown by `generate-deploy-secrets.sh` — especially `ADMIN_PASSWORD`.

Deploy:

```bash
bash scripts/deploy-production.sh
```

First build takes **5–10 minutes**. Caddy will automatically get an SSL certificate.

---

## Step 6 — Open the app

Visit:

```text
https://crm.yourcompany.com/whatsapp/inbox
```

Login with:

- **Email:** value from `ADMIN_EMAIL` in `deploy/.env`
- **Password:** value from `ADMIN_PASSWORD` in `deploy/.env`

---

## Step 7 — Configure Meta WhatsApp

1. Open **Settings → Meta Cloud API** in the app
2. Enter your Meta App ID, tokens, phone number ID, etc.
3. In **Meta Developer Dashboard → Webhook**:
   - **Callback URL:** `https://YOUR-DOMAIN/api/whatsapp/webhook`
   - **Verify token:** from `META_VERIFY_TOKEN` in `deploy/.env`

---

## Step 8 — Build Android APK (Play Store)

On your computer:

```bash
cd mobile
echo "CAPACITOR_SERVER_URL=https://crm.yourcompany.com" > .env
npm install
bash scripts/build-release.sh
```

Upload `mobile/android/app/build/outputs/bundle/release/app-release.aab` to Google Play.

---

## Managing the server

```bash
cd deploy

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Stop everything
docker compose -f docker-compose.prod.yml down

# Update after git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SSL certificate failed | DNS must point to server **before** deploy. Check with `dig YOUR-DOMAIN` |
| Blank page | Check `docker compose logs frontend` |
| Can't login | Check `ADMIN_PASSWORD` in `deploy/.env` |
| Webhook fails | Ensure port 80 and 443 are open in VPS firewall |
| Out of memory | Upgrade VPS to 4GB RAM |

### Open firewall ports (Ubuntu)

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## What's included in Docker

| Container | Purpose |
|-----------|---------|
| **caddy** | HTTPS reverse proxy (auto SSL) |
| **frontend** | Next.js web UI |
| **backend** | Express API + Socket.io |
| **mongodb** | Database |
| **minio** | File/media storage |

No separate database or S3 account needed — everything runs on your VPS.

---

## Security

Rate limiting, NoSQL injection prevention, database indexes, caching, and reverse-proxy hardening are documented in [SECURITY.md](./SECURITY.md).

---

## Optional: use MongoDB Atlas + AWS S3 instead

For larger production loads, edit `deploy/docker-compose.prod.yml` and `deploy/.env` to use external MongoDB Atlas and S3 instead of the built-in containers. See `deploy/.env.production.example` for variable names.
