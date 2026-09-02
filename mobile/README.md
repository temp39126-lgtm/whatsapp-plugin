# Android APK / Play Store build

Capacitor wraps the hosted WhatsApp CRM web app in a native Android shell.

- **Package name:** `app.whatsappcrm`
- **App name:** WhatsApp CRM
- **Loads:** Your deployed HTTPS frontend URL (backend API must be reachable from the same deployment)

## Prerequisites

1. **Node.js 18+**
2. **JDK 17+** (`java -version`)
3. **Android SDK** with API 35
   - Install [Android Studio](https://developer.android.com/studio) or command-line SDK
   - Set `ANDROID_HOME` and add `platform-tools` to `PATH`
4. **Hosted CRM URL** (stable HTTPS — not temporary Cloudflare trycloudflare links for production)

## Quick start (testing)

```bash
cd mobile
cp .env.example .env
# Edit .env — set CAPACITOR_SERVER_URL to your live CRM URL

npm install
bash scripts/build-debug.sh
```

Install the debug APK on a device:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Play Store signed release

```bash
cd mobile
cp .env.example .env
# Set CAPACITOR_SERVER_URL in .env

npm install
bash scripts/build-release.sh
```

Outputs:

| File | Use |
|------|-----|
| `android/app/build/outputs/bundle/release/app-release.aab` | **Upload to Google Play Console** |
| `android/app/build/outputs/apk/release/app-release.apk` | Sideload / testing |

### First release build

`build-release.sh` auto-generates `android/release.keystore` and `android/keystore.properties` if missing.

**Back up these files securely.** Play Store requires the same signing key for all updates.

To regenerate manually:

```bash
bash scripts/generate-keystore.sh
```

## Configuration

### `CAPACITOR_SERVER_URL`

Public HTTPS URL where the Next.js app is hosted, **no trailing slash**.

For production deployment, see **[deploy/HOSTING.md](../deploy/HOSTING.md)** — buy a domain, point DNS, run `npm run deploy:production`.

Example:

```env
CAPACITOR_SERVER_URL=https://crm.yourcompany.com
```

The app WebView opens this URL. API calls use `NEXT_PUBLIC_API_URL` baked into that deployment.

### Version bumps (Play Store updates)

Edit `android/app/build.gradle`:

- `versionCode` — integer, must increase each upload
- `versionName` — user-visible version string

## Permissions

The APK requests:

- Internet (CRM + API)
- Microphone (WhatsApp voice calls / WebRTC)
- Camera / media (attachments — optional hardware)

## Play Store checklist

- [ ] Stable production domain with valid HTTPS
- [ ] Privacy policy URL
- [ ] App icon (replace `android/app/src/main/res/mipmap-*`)
- [ ] Screenshots
- [ ] Upload `.aab` from release build
- [ ] Content rating questionnaire

## Root scripts

From repository root:

```bash
npm run mobile:install
npm run mobile:release
```

## Troubleshooting

**Blank screen:** `CAPACITOR_SERVER_URL` is wrong or server is down. Rebuild after fixing `.env`.

**Login/API errors:** Ensure backend CORS allows your production domain and `NEXT_PUBLIC_API_URL` points to the API.

**Microphone / calls:** Grant mic permission in Android settings; WebRTC requires HTTPS.

**Update app content:** Redeploy the web app — no APK rebuild needed when using remote URL mode.
