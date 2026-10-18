# Absolutely Nothing University (ANU · 绝对虚无大学)

> *Nihil Agere, Omnia Esse* — 什么都不做，即是一切。

Official satirical website & cloud student portal of **Absolutely Nothing University (ANU)**, founded in ∞ B.C., proudly ranked `NaN` across all global university rankings.

- **Production Frontend (GitHub Pages)**: `https://freeze.edu.kg`
- **Production Student API (Cloudflare Workers + D1)**: `https://api.freeze.edu.kg`

---

## 1. Architecture Overview (技术架构)

| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **Static Frontend** | GitHub Pages (`index.html`, `styles.css`, `app.js`, `js/*`) | 8 interactive campus portals, Oxford Royal Blue design, dark mode, bilingual (`zh`/`en`), 100% open to guests |
| **Identity & Auth** | Firebase Authentication Web SDK (`js/student-auth.js`) | Google-only Sign-In (`google.com`), SDK-managed IndexedDB persistence (zero `localStorage` raw tokens), iPhone Safari popup-to-redirect fallback |
| **Edge API** | Cloudflare Workers TypeScript (`worker/src/index.ts`) | RS256 Firebase JWT verification (`aud`, `iss`, `exp`, `iat`, `sub`), strict CORS & CSP, IP + UID rate limiting, server-side exam grading, idempotent import |
| **Database** | Cloudflare D1 SQLite (`worker/migrations/0001_initial_schema.sql`) | 1-UID-to-1-Profile constraint, globally unique ANU Student ID (`ANU-YYYY-XXXXXX`), private-by-default visibility, transcripts, papers, diplomas, honors |
| **Abuse Defense** | Cloudflare Turnstile + Admin Kill-Switches | Server-side Turnstile verification on registration/submission endpoints, emergency switches to pause registration, paper submissions, or diploma conferrals |

---

## 2. Local Preview & Automated Security Tests (本地运行与安全测试)

### 2.1 Run Static Frontend Locally

```bash
python3 -m http.server 8088
```

Visit `http://localhost:8088`. All 8 portals (including Guest Mode in **VIII. My ANU · 我的校园**) work out of the box.

### 2.2 Run Complete Automated Frontend + Worker + D1 Security Test Suite

Requires Node.js v22.5+ / v24+ (uses built-in `node:sqlite` and Web Crypto RS256):

```bash
node --no-warnings tests/run-tests.mjs
```

This single command verifies:
1. GitHub Pages `CNAME` (`freeze.edu.kg`), `.nojekyll`, `404.html`, and all 252 bilingual i18n keys.
2. High-DPI PNG exporters for all 3 diploma templates and *Nature: Nothing* acceptance letters.
3. Zero unsafe `innerHTML` assignments in `app.js` and zero `localStorage` token storage in `js/student-auth.js`.
4. Full D1 SQLite schema migration (`0001_initial_schema.sql`) + Cloudflare Worker security tests:
   - CORS origin whitelist & strict CSP/HSTS headers
   - Firebase JWT RS256 signature, `aud`, `iss`, `exp`, `iat`, and `google.com` provider enforcement
   - Rejection of client-supplied `uid` / `firebase_uid` spoofing attempts
   - Server-side Cloudflare Turnstile verification
   - 1-Firebase-UID-to-1-Student-Profile uniqueness & default `private` visibility
   - Explicit public consent lifecycle & instant revocation
   - Server-side exam grading, zero-word paper archiving, diploma registration, and idempotent local data import
   - Cross-account isolation, per-UID/IP rate limiting (`HTTP 429`), admin kill-switches, and permanent account deletion (`DELETE /api/v1/me`).

---

## 3. Step-by-Step Production Deployment Guide (云端手动配置与正式部署步骤)

> **Important Security Notice**: Never commit private keys, Cloudflare API tokens, `TURNSTILE_SECRET_KEY`, or `ADMIN_API_TOKEN` to Git. Follow every step below in order.

### Step 1: Configure Firebase Authentication & Google OAuth (`freeze.edu.kg`)

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project (e.g., `anu-freeze-edu`).
2. Navigate to **Project Settings → General → Your apps** and register a **Web App** (`</>`). Copy the `firebaseConfig` values (`apiKey`, `projectId`, `appId`).
3. Navigate to **Authentication → Sign-in method**:
   - Enable **Google** as the **ONLY** sign-in provider.
   - Configure the public-facing project name (`Absolutely Nothing University`) and support email.
   - Ensure Email/Password, Anonymous, and all other providers remain **Disabled**.
4. Navigate to **Authentication → Settings → Authorized domains** and add:
   - `freeze.edu.kg`
   - `localhost` (for local testing)
5. **iPhone Safari / Mobile ITP Best Practice (Custom Auth Domain)**:
   - To ensure `signInWithRedirect` works seamlessly on iPhone Safari with strict Intelligent Tracking Prevention (ITP), set `authDomain: "freeze.edu.kg"` (or configure Firebase Hosting / Cloudflare reverse proxy on `/__/auth/*` to `https://<project-id>.firebaseapp.com/__/auth/*`), or use `authDomain: "<project-id>.firebaseapp.com"` with `signInWithPopup` primary + redirect fallback (already built into `js/student-auth.js`).
   - In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), open the auto-created **Web client (auto created by Google Service)** OAuth 2.0 Client ID:
     - Under **Authorized JavaScript origins**, add `https://freeze.edu.kg`.
     - Under **Authorized redirect URIs**, verify `https://freeze.edu.kg/__/auth/handler` and `https://<project-id>.firebaseapp.com/__/auth/handler` are listed.

### Step 2: Configure Cloudflare Turnstile (Anti-Abuse)

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Turnstile** → **Add Widget**.
2. Widget name: `ANU Student Portal (freeze.edu.kg)`.
3. Hostnames: Add `freeze.edu.kg` and `localhost`.
4. Widget Mode: **Managed** (recommended).
5. Copy the **Site Key** (public) and **Secret Key** (private).

### Step 3: Update Frontend Public Runtime Config (`js/anu-config.js`)

Edit `js/anu-config.js` with your public identifiers (these are safe for static hosting; all security is enforced on the Worker):

```javascript
window.ANU_CONFIG = {
  apiBaseUrl: "https://api.freeze.edu.kg",
  turnstileSiteKey: "<YOUR_CLOUDFLARE_TURNSTILE_SITE_KEY>",
  firebase: {
    apiKey: "<YOUR_FIREBASE_WEB_API_KEY>",
    authDomain: "freeze.edu.kg", // or "<YOUR_PROJECT_ID>.firebaseapp.com"
    projectId: "<YOUR_FIREBASE_PROJECT_ID>",
    appId: "<YOUR_FIREBASE_APP_ID>"
  }
};
```

### Step 4: Create Cloudflare D1 Database & Apply Migrations

1. Install dependencies inside `worker/`:
   ```bash
   cd worker
   npm install
   npx wrangler login
   ```
2. Create the production D1 database:
   ```bash
   npx wrangler d1 create anu-campus-db
   ```
3. Copy the returned `database_id` into `worker/wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "anu-campus-db"
   database_id = "<YOUR_D1_DATABASE_UUID>"
   migrations_dir = "migrations"
   ```
   Also ensure `FIREBASE_PROJECT_ID` in `worker/wrangler.toml` matches your Firebase `projectId`.
4. Apply the schema migration locally first, then to production:
   ```bash
   npm run db:migrate:local
   npm run db:migrate:prod
   ```
5. **(Recommended Pre-Launch Gate)** Keep new public registrations paused in production until you finish verifying the deployed endpoints:
   ```bash
   npx wrangler d1 execute anu-campus-db --remote --command="UPDATE system_flags SET enabled = 0 WHERE flag_key = 'registration_enabled';"
   ```

### Step 5: Configure Cloudflare Worker Secrets

Set the three required server-side secrets via Wrangler (encrypted at rest by Cloudflare, never stored in code):

```bash
cd worker
npx wrangler secret put TURNSTILE_SECRET_KEY
# Paste your Cloudflare Turnstile Secret Key

npx wrangler secret put ADMIN_API_TOKEN
# Paste a high-entropy random token (at least 32 characters, e.g. generated via `openssl rand -hex 32`)

npx wrangler secret put IP_HASH_SALT
# Paste a random salt string (e.g. generated via `openssl rand -hex 16`)
```

### Step 6: Configure Custom Domain DNS (`api.freeze.edu.kg`) & Deploy Worker

1. Ensure the zone `freeze.edu.kg` is active in your Cloudflare account.
2. In `worker/wrangler.toml`, the custom domain route is already configured:
   ```toml
   routes = [
     { pattern = "api.freeze.edu.kg", custom_domain = true }
   ]
   ```
   When you deploy, Cloudflare Workers Custom Domains automatically creates the proxied DNS record and issues the TLS certificate for `api.freeze.edu.kg`. (Alternatively, in Cloudflare Dashboard → **Workers & Pages → anu-student-api → Settings → Domains & Routes**, click **Add → Custom Domain** and enter `api.freeze.edu.kg`).
3. Verify that GitHub Pages custom domain DNS records for `freeze.edu.kg` (Apex `A`/`AAAA` or `CNAME`) remain untouched so `https://freeze.edu.kg` continues serving the GitHub Pages frontend.
4. Deploy the Worker:
   ```bash
   cd worker
   npm run deploy
   ```

### Step 7: Post-Deploy Verification & Opening Public Registration

1. Verify API health & CORS headers:
   ```bash
   curl -i -H "Origin: https://freeze.edu.kg" https://api.freeze.edu.kg/api/v1/health
   ```
2. Once verified, enable public student registration via the authenticated Admin API:
   ```bash
   curl -X PUT https://api.freeze.edu.kg/api/v1/admin/flags \
     -H "Content-Type: application/json" \
     -H "X-Admin-Token: <YOUR_ADMIN_API_TOKEN>" \
     -d '{"flagKey":"registration_enabled","enabled":true,"note":"Production launch verified"}'
   ```

---

## 4. Database Backup, Restore & Emergency Admin Switches (备份恢复与紧急开关)

### 4.1 Automated Backup & Restore Script

Use `worker/scripts/backup-restore.sh` to export timestamped SQL backups with SHA-256 integrity checksums or restore from a backup:

```bash
./worker/scripts/backup-restore.sh backup
./worker/scripts/backup-restore.sh restore ./worker/backups/anu-campus-db-<TIMESTAMP>.sql
```

### 4.2 Emergency Admin Switches (`/api/v1/admin/flags`)

Administrators can immediately pause or resume any of the 4 campus subsystems without redeploying:
- `registration_enabled` (New student registrations)
- `paper_submission_enabled` (Zero-word manuscript submissions)
- `diploma_registration_enabled` (Honorary diploma cloud registrations)
- `public_directory_enabled` (Public Student ID lookup)

```bash
curl -X PUT https://api.freeze.edu.kg/api/v1/admin/flags \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: <YOUR_ADMIN_API_TOKEN>" \
  -d '{"flagKey":"paper_submission_enabled","enabled":false,"note":"Maintenance"}'
```
