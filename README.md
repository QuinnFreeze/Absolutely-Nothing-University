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
| **Identity & Auth** | Firebase Authentication Web SDK (`js/student-auth.js`) | Google-only client and Worker provider checks; Firebase SDK manages persistence, with no application-written raw tokens; popup sign-in is the current production path |
| **Edge API** | Cloudflare Workers TypeScript (`worker/src/index.ts`) | RS256 Firebase JWT verification (`aud`, `iss`, `exp`, `iat`, `sub`), strict CORS & CSP, IP + UID rate limiting, server-side exam grading, idempotent import |
| **Database** | Cloudflare D1 SQLite (`worker/migrations/`) | Unique Firebase UID and ANU Student ID, private profiles, academic archives, database-enforced capacity limits |
| **Abuse Defense** | Cloudflare Turnstile + Admin Kill-Switches | Server-side Turnstile verification on registration, paper/diploma writes and archive import; fixed-window request limits; switches to pause registration, paper submissions, diploma registrations or public lookup |

### Current release status (2026-10-18)

- The existing Firebase project is `project-8995408b-d1b3-4571-83b`. Its public Web App configuration is already in `js/anu-config.js`, with `authDomain: "project-8995408b-d1b3-4571-83b.firebaseapp.com"`.
- The Worker is reachable at `https://api.freeze.edu.kg/api/v1/health` (HTTP 200), and `worker/wrangler.toml` already contains the production D1 binding. Wrangler account authorization is available. Health alone does not verify authenticated writes, secrets or the deployed code version.
- Wrangler's secret-name listing confirms `ADMIN_API_TOKEN`, `IP_HASH_SALT` and `TURNSTILE_SECRET_KEY` are present. Their values were not read; live Turnstile and administrator operations still require separate validation.
- Firebase Console now shows Google as the only configured sign-in provider, with status **Enabled**. `freeze.edu.kg` is saved as a custom authorized domain; an independent public project-configuration check confirms all four domains: `localhost`, the project's `firebaseapp.com` and `web.app` domains, and `freeze.edu.kg`.
- Production Google OAuth with a real user, the complete authenticated archive workflow and physical iPhone Safari remain release checks. Local automated tests do not establish that these production flows work.
- GitHub Pages currently has no Firebase `/__/auth/*` helper or reverse proxy. Keep the existing Firebase `authDomain` and popup flow. Redirect fallback is permitted only after a working same-origin auth helper is configured and verified; changing `authDomain` alone does not provide that helper.

---

## 2. Local Preview & Automated Security Tests (本地运行与安全测试)

### 2.1 Run Static Frontend Locally

```bash
python3 -m http.server 8088
```

Visit `http://localhost:8088`. The 8 public campus portals and Guest Mode in **VIII. My ANU · 我的校园** can be previewed without signing in. Cloud account features require Firebase, Turnstile and the API to be configured and reachable.

### 2.2 Run Automated Frontend + Worker + SQLite Security Checks

Use Node.js v24+ (the tests import TypeScript and use built-in `node:sqlite` and Web Crypto RS256):

```bash
node --no-warnings tests/run-tests.mjs
```

The suite covers:
1. GitHub Pages `CNAME` (`freeze.edu.kg`), `.nojekyll`, `404.html`, bilingual dictionaries and HTML bindings.
2. PNG exporter code paths for all 3 diploma templates and *Nature: Nothing* acceptance letters, using a mocked canvas.
3. Static checks for user-input `innerHTML` assignments and application-written `localStorage` token storage, plus mocked client behavior checks.
4. Both SQLite migrations and actual Worker handlers through an in-memory D1-compatible adapter:
   - CORS origin whitelist & strict CSP/HSTS headers
   - Firebase JWT RS256 signature, `aud`, `iss`, `exp`, `iat`, and `google.com` provider enforcement
   - Rejection of client-supplied `uid` / `firebase_uid` spoofing attempts
   - Missing/invalid Cloudflare Turnstile rejection using a test verifier
   - 1-Firebase-UID-to-1-Student-Profile uniqueness & default `private` visibility
   - Explicit public consent lifecycle & instant revocation
   - Server-side exam grading, zero-word paper archiving, diploma registration, and idempotent local data import
   - Cross-account isolation, concurrent IP/UID/write-limit reservations, fixed-window reset, archive quota races and batch rollback, admin switches and archive deletion (`DELETE /api/v1/me`).

These are local checks with test JWT signing keys and mocked external services, not live Firebase OAuth or remote D1 end-to-end tests. Isolated Wrangler D1 checks also verified both migrations, the three quota triggers and atomic limiter SQL. Browser checks at 1440×1000 and 390×844 cover guest features, sync error/retry, security widgets and cloud save feedback; authenticated UI fixtures replace external services. Archive deletion removes the application's D1 records, not the Google account or Firebase identity. See `docs/SECURITY_AUDIT_REPORT.md` for the verification boundary.

---

## 3. Production Configuration & Release Checklist (现有云端配置与发布检查)

> Never commit private keys, Cloudflare API tokens, `TURNSTILE_SECRET_KEY`, `ADMIN_API_TOKEN` or `IP_HASH_SALT`. Firebase Web `apiKey` and other Web App identifiers are public configuration, not administrator secrets; apply appropriate API restrictions in Google Cloud. [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys).

### Step 1: Configure Firebase Authentication & Google OAuth (`freeze.edu.kg`)

1. Open the existing project `project-8995408b-d1b3-4571-83b` in [Firebase Console](https://console.firebase.google.com/). Do not create a replacement project for this release.
2. In **Project Settings → General → Your apps**, verify that the Web App configuration matches `js/anu-config.js` and that Worker `FIREBASE_PROJECT_ID` matches the same project.
3. In **Authentication → Sign-in method**, Google is already the only configured provider and is **Enabled** (verified 2026-10-18). Preserve this Google-only setup. Review the public-facing project name (`Absolutely Nothing University`) and support email if changing OAuth presentation.
4. In **Authentication → Settings → Authorized domains**, `freeze.edu.kg` has already been saved and independently verified in the public project configuration. Preserve it alongside `localhost` and the project's default `firebaseapp.com` / `web.app` domains.
5. Keep the current `authDomain: "project-8995408b-d1b3-4571-83b.firebaseapp.com"` and test Google login from a user click with `signInWithPopup`. Verify the Firebase-domain handler in the Google OAuth client's authorized redirect URIs if needed.
6. **Safari / redirect boundary**: Firebase redirect login relies on a helper domain and can fail when third-party storage is blocked. GitHub Pages does not currently serve that helper at `https://freeze.edu.kg/__/auth/*`. A future redirect setup requires the same-origin helper to work first, then its `authDomain` and OAuth redirect URI configuration, followed by browser verification. A 302 redirect is not a transparent auth proxy. See [Firebase's redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices). This release does not establish Safari redirect support.

### Step 2: Configure Cloudflare Turnstile (Anti-Abuse)

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Turnstile**, locate the existing widget matching `turnstileSiteKey` in `js/anu-config.js`.
2. Verify `freeze.edu.kg` and local test hostnames, and use **Managed** mode.
3. Verify the corresponding server-side `TURNSTILE_SECRET_KEY` exists on `anu-student-api`, then complete a real challenge and authenticated write. The public site key alone does not verify this pairing.

### Step 3: Update Frontend Public Runtime Config (`js/anu-config.js`)

The real public identifiers are already configured. If replacing them intentionally, copy the Web App configuration from Firebase Console and keep the project ID consistent with the Worker. The shape is:

```javascript
window.ANU_CONFIG = {
  apiBaseUrl: "https://api.freeze.edu.kg",
  turnstileSiteKey: "<YOUR_CLOUDFLARE_TURNSTILE_SITE_KEY>",
  firebase: {
    apiKey: "<YOUR_FIREBASE_WEB_API_KEY>",
    authDomain: "project-8995408b-d1b3-4571-83b.firebaseapp.com",
    projectId: "<YOUR_FIREBASE_PROJECT_ID>",
    appId: "<YOUR_FIREBASE_APP_ID>"
  }
};
```

### Step 4: Verify Existing Cloudflare D1 & Migrations

1. Install dependencies inside `worker/`:
   ```bash
   cd worker
   npm ci
   npx wrangler whoami
   ```
2. Verify the existing `anu-campus-db` binding before changing anything:
   ```bash
   npx wrangler d1 info anu-campus-db
   npx wrangler d1 migrations list anu-campus-db --remote
   ```
3. `worker/wrangler.toml` already includes the production `database_id`. Do not create another database or replace this binding as a routine release step.
4. Apply any pending schema migrations locally first. Back up the existing remote database before an authorized production migration:
   ```bash
   npm run db:migrate:local
   npm run db:migrate:prod
   ```
5. If a launch pause is required, set it explicitly; the initial schema currently seeds registration as enabled and does not imply a production pause:
   ```bash
   npx wrangler d1 execute anu-campus-db --remote --command="UPDATE system_flags SET enabled = 0 WHERE flag_key = 'registration_enabled';"
   ```

### Step 5: Configure Cloudflare Worker Secrets

First check secret names without printing their values:

```bash
cd worker
npx wrangler secret list
```

As of 2026-10-18, all three required names (`TURNSTILE_SECRET_KEY`, `ADMIN_API_TOKEN`, `IP_HASH_SALT`) are present. Name presence does not establish value validity. Existing secrets should not be overwritten during verification. If one is missing in a future environment, set it through Wrangler (never place the value in source or logs):

```bash
cd worker
npx wrangler secret put TURNSTILE_SECRET_KEY
# Paste your Cloudflare Turnstile Secret Key

npx wrangler secret put ADMIN_API_TOKEN
# Enter a high-entropy random administrator token

npx wrangler secret put IP_HASH_SALT
# Enter a cryptographically random salt
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
4. After the local checks pass and production release is authorized, deploy the Worker:
   ```bash
   cd worker
   npm run deploy
   ```

### Step 7: Post-Deploy Verification & Opening Public Registration

1. Verify API health & CORS headers:
   ```bash
   curl -i -H "Origin: https://freeze.edu.kg" https://api.freeze.edu.kg/api/v1/health
   ```
2. Complete Google login, registration with a real Turnstile challenge, archive sync/import, visibility opt-in/revocation and account archive deletion in a dedicated test account. Check production behavior separately from the local suite, including a physical iPhone Safari test.
3. Inspect the current system flags before changing them. If registration was paused for launch, enable it only after the release checks pass via the authenticated Admin API:
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
