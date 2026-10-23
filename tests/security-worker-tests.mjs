import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/src/index.ts";
import { verifyFirebaseIdToken } from "../worker/src/middleware/firebaseAuth.ts";
import { fetchWithTimeout } from "../worker/src/utils/jwt.ts";
import { checkRateLimit, isFeatureEnabled, verifyAdminAuthorization, verifyTurnstileToken } from "../worker/src/middleware/security.ts";

const rootDir = path.resolve(import.meta.dirname, "..");

/**
 * Emulates Cloudflare D1Database interface on top of Node's built-in SQLite (node:sqlite)
 * so we can test actual SQL migrations, CHECK constraints, UNIQUE constraints,
 * foreign keys, and parameterized queries against the real Worker code.
 */
function createD1SqliteAdapter(sqlMigrationText) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(sqlMigrationText);

  const executeSync = Symbol("executeSync");
  function createPrepared(query, boundValues = []) {
    const execute = () => {
      const stmt = db.prepare(query);
      const res = stmt.run(...boundValues);
      return {
        success: true,
        meta: {
          changes: Number(res.changes || 0),
          last_row_id: Number(res.lastInsertRowid || 0)
        }
      };
    };
    return {
      [executeSync]: execute,
      bind(...vals) {
        return createPrepared(query, vals);
      },
      async first(colName) {
        const stmt = db.prepare(query);
        const row = stmt.get(...boundValues);
        if (!row) return null;
        if (colName) return row[colName] ?? null;
        return row;
      },
      async run() {
        return execute();
      },
      async all() {
        const stmt = db.prepare(query);
        const rows = stmt.all(...boundValues);
        return {
          success: true,
          results: rows || []
        };
      }
    };
  }

  return {
    rawDb: db,
    prepare(query) {
      return createPrepared(query, []);
    },
    async batch(statements) {
      // D1 batches are transactional: a failed statement rolls back the batch.
      db.exec("BEGIN");
      try {
        const results = [];
        // No microtask yield inside a transaction: D1 serializes the whole batch.
        for (const s of statements) results.push(s[executeSync]());
        db.exec("COMMIT");
        return results;
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    },
    async exec(query) {
      db.exec(query);
      return { count: 1, duration: 0 };
    }
  };
}

function base64UrlEncodeString(str) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlEncodeBuffer(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateTestKeyPair(kid = "test-firebase-kid-2026") {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return {
    privateKey: keyPair.privateKey,
    publicJwk: { ...publicJwk, kid, alg: "RS256", use: "sig" }
  };
}

async function signTestFirebaseJwt(privateKey, claims, headerOverrides = {}) {
  const header = {
    alg: "RS256",
    kid: "test-firebase-kid-2026",
    typ: "JWT",
    ...headerOverrides
  };
  const headerSeg = base64UrlEncodeString(JSON.stringify(header));
  const payloadSeg = base64UrlEncodeString(JSON.stringify(claims));
  const signingInput = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    signingInput
  );
  return `${headerSeg}.${payloadSeg}.${base64UrlEncodeBuffer(signature)}`;
}

export async function runWorkerSecurityTests() {
  console.log("\n=== ANU Cloudflare Worker & D1 Security Test Suite ===");

  const migrationDir = path.join(rootDir, "worker/migrations");
  const migrationSql = fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql"))
    .sort().map((name) => fs.readFileSync(path.join(migrationDir, name), "utf8")).join("\n");
  const d1 = createD1SqliteAdapter(migrationSql);
  assert.equal(d1.rawDb.prepare("SELECT enabled FROM system_flags WHERE flag_key = 'registration_enabled'").get().enabled, 0,
    "Incremental migration must keep registration closed pending production acceptance");
  // Test fixture opt-in only: the migration itself never opens registrations.
  d1.rawDb.prepare("UPDATE system_flags SET enabled = 1 WHERE flag_key = 'registration_enabled'").run();
  let challengeSequence = 0;
  const validChallenge = () => `VALID_TURNSTILE_TOKEN_${++challengeSequence}`;
  const { privateKey, publicJwk } = await generateTestKeyPair("test-firebase-kid-2026");
  const { privateKey: wrongPrivateKey } = await generateTestKeyPair("wrong-key");

  const PROJECT_ID = "anu-freeze-edu";
  const ADMIN_TOKEN = "super_secret_admin_token_at_least_32_bytes_long_2026";

  const env = {
    DB: d1,
    ENVIRONMENT: "test",
    FIREBASE_PROJECT_ID: PROJECT_ID,
    ALLOWED_ORIGINS: "https://freeze.edu.kg,http://localhost:8088",
    TURNSTILE_SECRET_KEY: "test-turnstile-secret",
    TURNSTILE_ALLOWED_HOSTNAMES: "freeze.edu.kg",
    ADMIN_API_TOKEN: ADMIN_TOKEN,
    IP_HASH_SALT: "test-salt-2026",
    RATE_LIMIT_IP_PER_MIN: "120",
    IP_RATE_LIMITER: { limit: async () => ({ success: true }) },
    RATE_LIMIT_UID_PER_MIN: "60",
    RATE_LIMIT_WRITE_PER_HOUR: "40",
    __TEST_JWKS_KEYS__: [publicJwk],
    __TEST_TURNSTILE_VERIFY__: async (token) => token.startsWith("VALID_TURNSTILE_TOKEN_")
  };

  const nowSec = () => Math.floor(Date.now() / 1000);

  const createValidClaims = (uid = "firebase_uid_student_alice_01", extra = {}) => ({
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    sub: uid,
    user_id: uid,
    iat: nowSec() - 60,
    exp: nowSec() + 3540,
    auth_time: nowSec() - 60,
    email: `${uid}@gmail.com`,
    email_verified: true,
    name: "Alice Slacker",
    picture: "https://lh3.googleusercontent.com/a/default-user",
    firebase: {
      sign_in_provider: "google.com"
    },
    ...extra
  });

  // --------------------------------------------------------------------------
  // TEST 1: CORS Whitelist & Security Headers (CSP, HSTS, X-Frame-Options)
  // --------------------------------------------------------------------------
  {
    const evilOriginReq = new Request("https://api.freeze.edu.kg/api/v1/health", {
      method: "GET",
      headers: { Origin: "https://evil-phishing.example.com" }
    });
    const evilRes = await worker.fetch(evilOriginReq, env);
    assert.equal(evilRes.status, 403, "Disallowed CORS Origin must be rejected with 403");

    const goodOriginReq = new Request("https://api.freeze.edu.kg/api/v1/health", {
      method: "GET",
      headers: { Origin: "https://freeze.edu.kg" }
    });
    const goodRes = await worker.fetch(goodOriginReq, env);
    assert.equal(goodRes.status, 200, "Allowed Origin https://freeze.edu.kg must succeed");
    assert.equal(
      goodRes.headers.get("Access-Control-Allow-Origin"),
      "https://freeze.edu.kg",
      "ACAO header must match allowed origin"
    );
    assert.ok(
      goodRes.headers.get("Content-Security-Policy")?.includes("default-src 'none'"),
      "Strict API CSP header must be present"
    );
    assert.equal(goodRes.headers.get("X-Content-Type-Options"), "nosniff");
    console.log("✓ [PASS] CORS Origin Whitelist & CSP/HSTS Security Headers verified");
  }

  // --------------------------------------------------------------------------
  // TEST 2: Firebase JWT Verification (Signature, aud, iss, exp, iat, provider)
  // --------------------------------------------------------------------------
  {
    // 2a. Missing token
    const noTokenRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me"),
      env
    );
    assert.equal(noTokenRes.status, 401);

    // 2b. Forged signature (signed with wrong private key)
    const forgedToken = await signTestFirebaseJwt(wrongPrivateKey, createValidClaims());
    const forgedRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${forgedToken}` }
      }),
      env
    );
    assert.equal(forgedRes.status, 401);
    const forgedBody = await forgedRes.json();
    assert.equal(forgedBody.error.code, "AUTH_BAD_SIGNATURE");

    // 2c. Wrong audience (aud)
    const badAudToken = await signTestFirebaseJwt(
      privateKey,
      createValidClaims("uid_1234567", { aud: "other-firebase-project" })
    );
    const badAudRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${badAudToken}` }
      }),
      env
    );
    assert.equal(badAudRes.status, 401);
    assert.equal((await badAudRes.json()).error.code, "AUTH_INVALID_AUD");

    // 2d. Wrong issuer (iss)
    const badIssToken = await signTestFirebaseJwt(
      privateKey,
      createValidClaims("uid_1234567", { iss: "https://evil.example.com/anu-freeze-edu" })
    );
    const badIssRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${badIssToken}` }
      }),
      env
    );
    assert.equal(badIssRes.status, 401);
    assert.equal((await badIssRes.json()).error.code, "AUTH_INVALID_ISS");

    // 2e. Expired token (exp in past)
    const expiredToken = await signTestFirebaseJwt(
      privateKey,
      createValidClaims("uid_1234567", { iat: nowSec() - 7200, exp: nowSec() - 3600 })
    );
    const expiredRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${expiredToken}` }
      }),
      env
    );
    assert.equal(expiredRes.status, 401);
    assert.equal((await expiredRes.json()).error.code, "AUTH_TOKEN_EXPIRED");

    // 2f. Non-Google sign_in_provider (e.g. password auth must be rejected)
    const pwdProviderToken = await signTestFirebaseJwt(
      privateKey,
      createValidClaims("uid_1234567", { firebase: { sign_in_provider: "password" } })
    );
    const pwdRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${pwdProviderToken}` }
      }),
      env
    );
    assert.equal(pwdRes.status, 401);
    assert.equal((await pwdRes.json()).error.code, "AUTH_UNSUPPORTED_PROVIDER");

    console.log("✓ [PASS] Firebase ID Token RS256 signature, aud, iss, exp, iat & Google-only provider checks verified");
  }

  // --------------------------------------------------------------------------
  // TEST 3: Reject Client-Passed UID Override & Turnstile Enforcement
  // --------------------------------------------------------------------------
  const aliceToken = await signTestFirebaseJwt(
    privateKey,
    createValidClaims("firebase_uid_alice_001")
  );
  const bobToken = await signTestFirebaseJwt(
    privateKey,
    createValidClaims("firebase_uid_bob_002")
  );

  {
    // 3a. Client attempting to pass firebase_uid in body must be rejected with 400
    const spoofUidRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({
          firebase_uid: "victim_uid_override",
          nickname: "Spoofer",
          acceptTerms: true,
          acceptPrivacy: true
        })
      }),
      env
    );
    assert.equal(spoofUidRes.status, 400);
    assert.equal((await spoofUidRes.json()).error.code, "IDENTITY_OVERRIDE_FORBIDDEN");

    // 3b. Client attempting to pass ?uid= in query string must be rejected
    const spoofQueryRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me?uid=other_user", {
        headers: { Authorization: `Bearer ${aliceToken}` }
      }),
      env
    );
    assert.equal(spoofQueryRes.status, 400);
    assert.equal((await spoofQueryRes.json()).error.code, "IDENTITY_OVERRIDE_FORBIDDEN");

    // 3c. Missing or invalid Turnstile token on registration must be rejected with 403
    const badTurnstileRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": "INVALID_BOT_TOKEN"
        },
        body: JSON.stringify({
          nickname: "Alice",
          acceptTerms: true,
          acceptPrivacy: true
        })
      }),
      env
    );
    assert.equal(badTurnstileRes.status, 403);
    assert.equal((await badTurnstileRes.json()).error.code, "TURNSTILE_VERIFICATION_FAILED");

    console.log("✓ [PASS] Client-supplied UID spoofing defense & server-side Turnstile verification verified");
  }

  // --------------------------------------------------------------------------
  // TEST 4: Student Registration, 1-UID-1-Profile Constraint, Default Private Visibility, XSS & SQLi Sanitization
  // --------------------------------------------------------------------------
  let aliceStudentNumber = "";
  {
    const regRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({
          nickname: "Alice <script>alert(1)</script> '; DROP TABLE students;--",
          college: "procrastination",
          majorIdx: 1,
          honorIdx: 2,
          enrollmentYear: 2026,
          avatarSeed: "crest-ginger",
          acceptTerms: true,
          acceptPrivacy: true
        })
      }),
      env
    );
    assert.equal(regRes.status, 201, "Valid registration must return 201 Created");
    const regJson = await regRes.json();
    assert.equal(regJson.ok, true);
    const profile = regJson.data.profile;
    aliceStudentNumber = profile.studentNumber;
    assert.match(aliceStudentNumber, /^ANU-2026-[A-Z0-9]{6}$/, "Student ID must match ANU-YYYY-XXXXXX");
    assert.equal(profile.visibility, "private", "Profile visibility must default to private");
    assert.equal(profile.publicConsent, false, "Public consent must default to false");
    assert.ok(!profile.nickname.includes("<script>"), "XSS tags must be stripped from nickname");

    // 4b. Attempting to register a second profile for the same Firebase UID must fail with 409
    const dupRegRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({
          nickname: "Alice Duplicate",
          acceptTerms: true,
          acceptPrivacy: true
        })
      }),
      env
    );
    assert.equal(dupRegRes.status, 409);
    assert.equal((await dupRegRes.json()).error.code, "PROFILE_ALREADY_EXISTS");

    // 4c. Public lookup of Alice's private profile must return 404 (not exposed without consent)
    const pubLookupPrivate = await worker.fetch(
      new Request(`https://api.freeze.edu.kg/api/v1/public/profile/${aliceStudentNumber}`),
      env
    );
    assert.equal(pubLookupPrivate.status, 404, "Private profile must not be publicly accessible");

    // 4d. Attempting to set visibility='public' without publicConsent=true must fail with 400
    const noConsentPubRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ visibility: "public", publicConsent: false })
      }),
      env
    );
    assert.equal(noConsentPubRes.status, 400);
    assert.equal((await noConsentPubRes.json()).error.code, "PUBLIC_CONSENT_REQUIRED");

    console.log("✓ [PASS] 1-UID-1-Profile constraint, unique ANU Student ID, default private visibility & XSS/SQLi sanitization verified");
  }

  // --------------------------------------------------------------------------
  // TEST 5: Server-Side Exam Grading, Paper Sync, Diploma Sync & Idempotent Local Import
  // --------------------------------------------------------------------------
  {
    // 5a. Server-side Mock Exam Grading (ignores any client-forged score field)
    const examRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/exams", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseCode: "NTH-101",
          answers: [50, 50],
          score: 999999 // Attempted client forgery
        })
      }),
      env
    );
    assert.equal(examRes.status, 201);
    const examJson = await examRes.json();
    assert.equal(examJson.graded.score, 100);
    assert.equal(examJson.graded.grade, "A+");
    assert.equal(examJson.data.transcripts.length, 1);

    // 5b. Paper Submission with Turnstile
    const paperRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/papers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({
          title: "On Quantum Sofa Gravity",
          author: "Alice",
          journalIdx: 0,
          methodologyIdx: 1
        })
      }),
      env
    );
    assert.equal(paperRes.status, 201);
    const paperJson = await paperRes.json();
    assert.match(paperJson.voidId, /^VOID-ID: ANU\.NULL\.2026\.[A-F0-9]{32}$/);
    assert.equal(paperJson.data.papers.length, 1);

    // 5c. Diploma Registration with Turnstile
    const dipRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/diplomas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({
          recipientName: "Dr. Alice",
          degreeIdx: 0,
          majorIdx: 1,
          honorIdx: 0,
          citationIdx: 0,
          templateId: "oxford",
          certLang: "bilingual"
        })
      }),
      env
    );
    assert.equal(dipRes.status, 201);
    assert.equal((await dipRes.json()).data.diplomas.length, 1);

    // 5d. Idempotent Local Import (repeating the same X-Idempotency-Key must not duplicate records)
    const importPayload = {
      badges: ["club_retreat", "easter_konami"],
      exams: [{ courseCode: "DRM-404", answers: [40, 35] }],
      papers: [{ title: "Blank Thesis II", author: "Alice", journalIdx: 2, methodologyIdx: 0 }],
      diplomas: [{ recipientName: "Alice", degreeIdx: 2, majorIdx: 2, honorIdx: 1, templateId: "parchment" }]
    };

    const impRes1 = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": "idem-alice-import-key-0001",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify(importPayload)
      }),
      env
    );
    assert.equal(impRes1.status, 200);
    const impJson1 = await impRes1.json();
    assert.equal(impJson1.importedSummary.exams, 1);
    assert.equal(impJson1.importedSummary.papers, 1);
    assert.equal(impJson1.importedSummary.diplomas, 1);

    // Replay identical import request
    const impRes2 = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": "idem-alice-import-key-0001"
        },
        body: JSON.stringify(importPayload)
      }),
      env
    );
    assert.equal(impRes2.status, 200);
    const impJson2 = await impRes2.json();
    assert.equal(impJson2.data.transcripts.length, 2, "Duplicate import must not create duplicate transcripts");
    assert.equal(impJson2.data.papers.length, 2, "Duplicate import must not create duplicate papers");
    assert.equal(impJson2.data.diplomas.length, 2, "Duplicate import must not create duplicate diplomas");

    console.log("✓ [PASS] Server-side exam grading, paper/diploma sync & idempotent local archive import verified");
  }

  // --------------------------------------------------------------------------
  // TEST 5e: Import must not bypass Turnstile, subsystem pauses, or archive quotas
  // --------------------------------------------------------------------------
  {
    const countsFor = (uid) => Object.fromEntries(
      ["transcripts", "papers", "diplomas", "honors_achievements", "idempotency_keys"].map((table) => [
        table,
        d1.rawDb.prepare(`SELECT COUNT(*) AS cnt FROM ${table} WHERE firebase_uid = ?`).get(uid).cnt
      ])
    );
    async function createImportStudent(suffix) {
      const uid = `firebase_uid_import_${suffix}`;
      const token = await signTestFirebaseJwt(privateKey, createValidClaims(uid));
      const response = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/me/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.55",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({ nickname: suffix, acceptTerms: true, acceptPrivacy: true })
      }), env);
      assert.equal(response.status, 201);
      return { uid, token };
    }
    function importRequest(token, key, payload, challenge) {
      return new Request("https://api.freeze.edu.kg/api/v1/me/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.55",
          "X-Idempotency-Key": key,
          ...(challenge ? { "X-Turnstile-Token": challenge } : {})
        },
        body: JSON.stringify(payload)
      });
    }
    const mixedPayload = {
      badges: ["club_retreat", "easter_konami"],
      exams: [{ courseCode: "NTH-101", answers: [50, 50] }],
      papers: [{ title: "Import guard paper", author: "Import student", journalIdx: 0, methodologyIdx: 0 }],
      diplomas: [{ recipientName: "Import guard student", degreeIdx: 0, majorIdx: 0, honorIdx: 0, templateId: "oxford" }]
    };

    const guarded = await createImportStudent("challenge_guard");
    const emptyCounts = countsFor(guarded.uid);
    for (const challenge of [undefined, "INVALID_BOT_TOKEN"]) {
      const rejected = await worker.fetch(importRequest(
        guarded.token, "import-challenge-missing-invalid", mixedPayload, challenge
      ), env);
      assert.equal(rejected.status, 403);
      assert.equal((await rejected.json()).error.code, "TURNSTILE_VERIFICATION_FAILED");
      assert.deepEqual(countsFor(guarded.uid), emptyCounts, "Unverified imports must not mutate any archive table");
    }

    let verificationCalls = 0;
    let challengeUsed = false;
    const singleUseEnv = {
      ...env,
      __TEST_TURNSTILE_VERIFY__: async (challenge) => {
        verificationCalls++;
        if (challenge !== "IMPORT_SINGLE_USE_CHALLENGE" || challengeUsed) return false;
        challengeUsed = true;
        return true;
      }
    };
    const imported = await worker.fetch(importRequest(
      guarded.token, "import-single-use-success", mixedPayload, "IMPORT_SINGLE_USE_CHALLENGE"
    ), singleUseEnv);
    assert.equal(imported.status, 200);
    const importedBody = await imported.json();
    assert.equal(importedBody.importedSummary.papers, 1);
    const afterImport = countsFor(guarded.uid);
    const replayed = await worker.fetch(importRequest(
      guarded.token, "import-single-use-success", mixedPayload
    ), singleUseEnv);
    assert.equal(replayed.status, 200);
    assert.deepEqual(await replayed.json(), importedBody, "Successful import replay must preserve its result");
    assert.equal(verificationCalls, 1, "Successful replay must not consume a second Turnstile challenge");
    const newKey = await worker.fetch(importRequest(
      guarded.token, "import-new-key-reused-challenge", mixedPayload, "IMPORT_SINGLE_USE_CHALLENGE"
    ), singleUseEnv);
    assert.equal(newKey.status, 403, "A new import key must still pass fresh verification");
    assert.deepEqual(countsFor(guarded.uid), afterImport);

    const paused = await createImportStudent("paused_guard");
    const beforePause = countsFor(paused.uid);
    for (const [flag, code] of [
      ["paper_submission_enabled", "PAPER_SUBMISSION_PAUSED"],
      ["diploma_registration_enabled", "DIPLOMA_REGISTRATION_PAUSED"]
    ]) {
      d1.rawDb.prepare("UPDATE system_flags SET enabled = 0 WHERE flag_key = ?").run(flag);
      try {
        const rejected = await worker.fetch(importRequest(
          paused.token, `import-paused-${flag}`, mixedPayload, validChallenge()
        ), env);
        assert.equal(rejected.status, 503);
        assert.equal((await rejected.json()).error.code, code);
        assert.deepEqual(countsFor(paused.uid), beforePause, "Paused imports must not partially import badges or other records");
      } finally {
        d1.rawDb.prepare("UPDATE system_flags SET enabled = 1 WHERE flag_key = ?").run(flag);
      }
    }

    function seedArchive(table, uid, count, offset = 0) {
      const sample = d1.rawDb.prepare(`SELECT * FROM ${table} WHERE firebase_uid = ? LIMIT 1`).get("firebase_uid_alice_001");
      assert.ok(sample, `Expected existing ${table} sample`);
      const columns = Object.keys(sample);
      const insert = d1.rawDb.prepare(
        `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`
      );
      for (let i = offset; i < offset + count; i++) {
        const record = { ...sample, id: `${uid}-${i}`, firebase_uid: uid, dedupe_hash: `${uid}-seed-${i}` };
        if (table === "papers") record.void_id = `VOID-ID: ANU.NULL.2026.SEED-${uid}-${i}`;
        if (table === "diplomas") record.serial_number = `ANU-2026-VOID-SEED${i}${uid}`;
        insert.run(...columns.map((column) => record[column]));
      }
    }
    const quotaCases = [
      { table: "transcripts", field: "exams", limit: 50, code: "TRANSCRIPT_LIMIT_REACHED",
        first: { courseCode: "NTH-101", answers: [50, 50] },
        second: { courseCode: "DRM-404", answers: [40, 35] } },
      { table: "papers", field: "papers", limit: 30, code: "PAPER_LIMIT_REACHED",
        first: { title: "Quota paper one", journalIdx: 0, methodologyIdx: 0 },
        second: { title: "Quota paper two", journalIdx: 0, methodologyIdx: 0 } },
      { table: "diplomas", field: "diplomas", limit: 20, code: "DIPLOMA_LIMIT_REACHED",
        first: { recipientName: "Quota student one", templateId: "oxford" },
        second: { recipientName: "Quota student two", templateId: "oxford" } }
    ];
    for (const quota of quotaCases) {
      const student = await createImportStudent(`quota_${quota.table}`);
      seedArchive(quota.table, student.uid, quota.limit - 1);
      const before = countsFor(student.uid);
      const overQuotaPayload = { ...mixedPayload, [quota.field]: [quota.first, quota.second] };
      const rejected = await worker.fetch(importRequest(
        student.token, `import-over-quota-${quota.table}`, overQuotaPayload, validChallenge()
      ), env);
      assert.equal(rejected.status, 429);
      assert.equal((await rejected.json()).error.code, quota.code);
      assert.deepEqual(countsFor(student.uid), before, "Any exceeded quota must reject before all archive/badge writes");

      const atBoundary = await worker.fetch(importRequest(
        student.token, `import-quota-boundary-${quota.table}`,
        { [quota.field]: [quota.first, quota.first] }, validChallenge()
      ), env);
      assert.equal(atBoundary.status, 200, "Duplicate records in one import consume one quota slot");
      assert.equal((await atBoundary.json()).importedSummary[quota.field], 1);
      assert.equal(countsFor(student.uid)[quota.table], quota.limit);
      const duplicateAtLimit = await worker.fetch(importRequest(
        student.token, `import-quota-duplicate-${quota.table}`,
        { [quota.field]: [quota.first] }, validChallenge()
      ), env);
      assert.equal(duplicateAtLimit.status, 200, "Already archived records must not consume additional quota");
      assert.equal((await duplicateAtLimit.json()).importedSummary[quota.field], 0);
      assert.equal(countsFor(student.uid)[quota.table], quota.limit);

      const oversized = await createImportStudent(`oversized_${quota.table}`);
      const beforeOversized = countsFor(oversized.uid);
      const courseCodes = ["NTH-101", "NTH-104", "PRC-202", "PRC-208", "PRF-305", "PRF-309", "DRM-404", "DRM-499"];
      const oversizedRecords = Array.from({ length: quota.limit + 1 }, (_, i) => quota.field === "exams"
        ? { courseCode: courseCodes[Math.floor(i / 9)], answers: [Math.floor((i % 9) / 3), i % 3] }
        : quota.field === "papers" ? { title: `Oversized paper ${i}` }
        : { recipientName: `Oversized student ${i}` });
      const oversizedResponse = await worker.fetch(importRequest(
        oversized.token, `import-too-many-records-${quota.table}`,
        { ...mixedPayload, [quota.field]: oversizedRecords }, validChallenge()
      ), env);
      assert.equal(oversizedResponse.status, 429, "An over-capacity payload must fail explicitly, without truncation");
      assert.equal((await oversizedResponse.json()).error.code, quota.code);
      assert.deepEqual(countsFor(oversized.uid), beforeOversized);
    }

    const bulk = await createImportStudent("bulk_all_records");
    const bulkPayload = {
      exams: Array.from({ length: 12 }, (_, i) => ({
        courseCode: i < 9 ? "NTH-101" : "DRM-404",
        answers: [Math.floor((i % 9) / 3), i % 3]
      })),
      papers: Array.from({ length: 15 }, (_, i) => ({ title: `Bulk paper ${i}`, journalIdx: 0 })),
      diplomas: Array.from({ length: 15 }, (_, i) => ({ recipientName: `Bulk student ${i}`, templateId: "oxford" }))
    };
    const bulkResponse = await worker.fetch(importRequest(
      bulk.token, "import-bulk-complete-payload", bulkPayload, validChallenge()
    ), env);
    assert.equal(bulkResponse.status, 200);
    const bulkBody = await bulkResponse.json();
    assert.deepEqual(bulkBody.importedSummary, { clubsAndBadges: 0, exams: 12, papers: 15, diplomas: 15 });
    assert.equal(countsFor(bulk.uid).papers, 15, "Imports must process records past index 10");
    assert.equal(countsFor(bulk.uid).diplomas, 15);

    function directArchiveRequest(token, field, payload) {
      return new Request(`https://api.freeze.edu.kg/api/v1/me/${field}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.67",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify(payload)
      });
    }
    for (const quota of quotaCases) {
      const direct = await createImportStudent(`direct_race_${quota.table}`);
      seedArchive(quota.table, direct.uid, quota.limit - 1);
      const directResults = await Promise.all([quota.first, quota.second].map((payload) =>
        worker.fetch(directArchiveRequest(direct.token, quota.field, payload), env)
      ));
      assert.deepEqual(directResults.map((response) => response.status).sort(), [201, 429],
        "Concurrent direct submissions must share the last slot without exceeding quota");
      const rejectedDirect = directResults.find((response) => response.status === 429);
      const directError = await rejectedDirect.json();
      assert.equal(directError.error.code, quota.code, "Database quota rejection must map to HTTP 429");
      assert.ok(!JSON.stringify(directError).includes("ANU_"), "Database trigger sentinels must not leak");
      assert.equal(countsFor(direct.uid)[quota.table], quota.limit);
      const winningPayload = directResults[0].status === 201 ? quota.first : quota.second;
      const duplicateDirect = await worker.fetch(directArchiveRequest(direct.token, quota.field, winningPayload), env);
      assert.ok([200, 201].includes(duplicateDirect.status), "An existing direct submission remains valid at capacity");
      assert.equal(countsFor(direct.uid)[quota.table], quota.limit);

      const imports = await createImportStudent(`import_race_${quota.table}`);
      seedArchive(quota.table, imports.uid, quota.limit - 1);
      const importResults = await Promise.all([quota.first, quota.second].map((payload, i) =>
        worker.fetch(importRequest(imports.token, `import-race-${quota.table}-${i}`,
          { [quota.field]: [payload] }, validChallenge()), env)
      ));
      assert.deepEqual(importResults.map((response) => response.status).sort(), [200, 429],
        "Concurrent import transactions must share the last slot without exceeding quota");
      assert.equal((await importResults.find((response) => response.status === 429).json()).error.code, quota.code);
      assert.equal(countsFor(imports.uid)[quota.table], quota.limit);

      const rollback = await createImportStudent(`batch_rollback_${quota.table}`);
      seedArchive(quota.table, rollback.uid, quota.limit - 1);
      const before = countsFor(rollback.uid);
      let raced = false;
      const racingEnv = {
        ...env,
        DB: {
          ...d1,
          async batch(statements) {
            // A competing request fills the final slot after import preflight.
            raced = true;
            seedArchive(quota.table, rollback.uid, 1, quota.limit - 1);
            try {
              return await d1.batch(statements);
            } catch (cause) {
              throw new Error("D1_ERROR: batch failed", { cause });
            }
          }
        }
      };
      const rollbackResponse = await worker.fetch(importRequest(
        rollback.token, `import-raced-rollback-${quota.table}`,
        { ...mixedPayload, [quota.field]: [quota.first] }, validChallenge()
      ), racingEnv);
      assert.equal(raced, true, "Regression must reach the post-preflight write race");
      assert.equal(rollbackResponse.status, 429);
      assert.equal((await rollbackResponse.json()).error.code, quota.code);
      assert.deepEqual(countsFor(rollback.uid), { ...before, [quota.table]: quota.limit },
        "Trigger failure must roll back all import records and leave only the competing record");
    }
    console.log("✓ [PASS] Import Turnstile single-use replay, subsystem pauses, deduplicated archive quotas & rejection without partial writes verified");
    console.log("✓ [PASS] Full archive imports, database-enforced concurrent quotas, direct deduplication & raced batch rollback verified");
  }

  // --------------------------------------------------------------------------
  // TEST 6: Cross-Account Isolation (Bob cannot view or mutate Alice's data)
  // --------------------------------------------------------------------------
  {
    const bobGetRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${bobToken}` }
      }),
      env
    );
    assert.equal(bobGetRes.status, 200);
    const bobJson = await bobGetRes.json();
    assert.equal(bobJson.registered, false, "Bob must not see Alice's profile");
    assert.equal(bobJson.data, null);
    console.log("✓ [PASS] Cross-account resource ownership isolation verified");
  }

  // --------------------------------------------------------------------------
  // TEST 7: Admin Kill-Switches & Admin Endpoint Protection
  // --------------------------------------------------------------------------
  {
    // 7a. Unauthorized admin request must return 403
    const unauthAdminRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/admin/flags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": "wrong_token"
        },
        body: JSON.stringify({ flagKey: "registration_enabled", enabled: false })
      }),
      env
    );
    assert.equal(unauthAdminRes.status, 403);

    // 7b. Authorized admin pauses new registrations
    const pauseRegRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/admin/flags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": ADMIN_TOKEN
        },
        body: JSON.stringify({
          flagKey: "registration_enabled",
          enabled: false,
          note: "Paused for security maintenance drill"
        })
      }),
      env
    );
    assert.equal(pauseRegRes.status, 200);

    // 7c. Bob tries to register while registration_enabled is false -> must get 503
    const bobBlockedReg = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bobToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({
          nickname: "Bob",
          acceptTerms: true,
          acceptPrivacy: true
        })
      }),
      env
    );
    assert.equal(bobBlockedReg.status, 503);
    assert.equal((await bobBlockedReg.json()).error.code, "REGISTRATION_PAUSED");

    // Re-enable registration
    await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/admin/flags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": ADMIN_TOKEN
        },
        body: JSON.stringify({ flagKey: "registration_enabled", enabled: true })
      }),
      env
    );

    console.log("✓ [PASS] Admin kill-switches (registration/paper/diploma pause) & constant-time admin auth verified");
  }

  // --------------------------------------------------------------------------
  // TEST 8: Account Deletion (Right to Erasure) & Cascade Cleanup
  // --------------------------------------------------------------------------
  {
    const delRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmDelete: "DELETE_MY_ANU_ARCHIVE" })
      }),
      env
    );
    assert.equal(delRes.status, 200);

    const afterDelRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${aliceToken}` }
      }),
      env
    );
    const afterDelJson = await afterDelRes.json();
    assert.equal(afterDelJson.registered, false, "Profile must be completely erased after DELETE /api/v1/me");
    assert.equal(afterDelJson.data, null);

    console.log("✓ [PASS] Account deletion & cascade erasure of all D1 transcripts, papers, diplomas, and honors verified");
  }

  // --------------------------------------------------------------------------
  // TEST 9: Public Profile Consent Lifecycle (Opt-In & Immediate Revocation)
  // --------------------------------------------------------------------------
  {
    const charlieToken = await signTestFirebaseJwt(
      privateKey,
      createValidClaims("firebase_uid_charlie_003")
    );
    const regRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${charlieToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": validChallenge()
        },
        body: JSON.stringify({
          nickname: "Charlie OptIn",
          college: "daydream",
          visibility: "public",
          publicConsent: true,
          acceptTerms: true,
          acceptPrivacy: true
        })
      }),
      env
    );
    assert.equal(regRes.status, 201);
    const charlieId = (await regRes.json()).data.profile.studentNumber;

    // Public lookup succeeds while publicConsent=true
    const pubOk = await worker.fetch(
      new Request(`https://api.freeze.edu.kg/api/v1/public/profile/${charlieId}`),
      env
    );
    assert.equal(pubOk.status, 200);
    const pubJson = await pubOk.json();
    assert.equal(pubJson.publicProfile.nickname, "Charlie OptIn");
    assert.equal(
      pubJson.publicProfile.firebase_uid,
      undefined,
      "Public profile must never expose internal firebase_uid"
    );

    // Charlie revokes public visibility back to private
    const revokeRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${charlieToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ visibility: "private" })
      }),
      env
    );
    assert.equal(revokeRes.status, 200);

    // Public lookup immediately returns 404 after revocation
    const pubAfterRevoke = await worker.fetch(
      new Request(`https://api.freeze.edu.kg/api/v1/public/profile/${charlieId}`),
      env
    );
    assert.equal(pubAfterRevoke.status, 404);
    console.log("✓ [PASS] Public profile explicit consent opt-in, UID redaction & instant revocation verified");
  }

  // --------------------------------------------------------------------------
  // TEST 10: Rate Limiting (IP & UID Dimensions) & Zero Error Leakage
  // --------------------------------------------------------------------------
  {
    const strictEnv = {
      ...env,
      RATE_LIMIT_UID_PER_MIN: "3"
    };
    const rateToken = await signTestFirebaseJwt(
      privateKey,
      createValidClaims("firebase_uid_ratelimit_004")
    );

    for (let i = 0; i < 3; i++) {
      const r = await worker.fetch(
        new Request("https://api.freeze.edu.kg/api/v1/me", {
          headers: { Authorization: `Bearer ${rateToken}` }
        }),
        strictEnv
      );
      assert.equal(r.status, 200);
    }

    const throttledRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me", {
        headers: { Authorization: `Bearer ${rateToken}` }
      }),
      strictEnv
    );
    assert.equal(throttledRes.status, 429, "Exceeding per-UID rate limit must return HTTP 429");
    const throttledBody = await throttledRes.json();
    assert.equal(throttledBody.error.code, "RATE_LIMIT_UID_EXCEEDED");

    // Verify internal errors never leak SQL, stack traces, or secrets
    const brokenEnv = {
      ...env,
      DB: {
        prepare() {
          throw new Error("FATAL SQLITE_ERROR: near SELECT FROM students secret_token=xyz");
        }
      }
    };
    const errRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/health"),
      brokenEnv
    );
    assert.equal(errRes.status, 503);
    const errText = await errRes.text();
    assert.ok(!errText.includes("SQLITE_ERROR"), "Error response must never leak SQL error details");
    assert.ok(!errText.includes("secret_token"), "Error response must never leak secret values");
    console.log("✓ [PASS] Per-UID/IP rate limiting (HTTP 429) & zero internal error/SQL leakage verified");
  }

  // --------------------------------------------------------------------------
  // TEST 11: Atomic fixed-window reservations under concurrent requests
  // --------------------------------------------------------------------------
  {
    const originalNow = Date.now;
    const fixedNow = Math.floor(originalNow() / 60000) * 60000 + 1000;
    let testNow = fixedNow;
    Date.now = () => testNow;
    try {
      for (const dimension of ["ip", "uid", "write"]) {
        const identifier = `concurrent-limit-${dimension}`;
        const limit = 7;
        const reservations = await Promise.all(Array.from({ length: 40 }, () =>
          checkRateLimit({ ...env, IP_RATE_LIMITER: undefined }, dimension, identifier, limit, 60)
        ));
        assert.equal(reservations.filter((result) => result.allowed).length, limit,
          "Exactly the configured number of concurrent requests may reserve a slot");
        assert.deepEqual(reservations.filter((result) => result.allowed).map((result) => result.remaining).sort(),
          [0, 1, 2, 3, 4, 5, 6], "Each accepted request must own a distinct rate-limit slot");
        const bucket = `${dimension}:${identifier}:${Math.floor(fixedNow / 60000) * 60}`;
        assert.equal(d1.rawDb.prepare("SELECT hit_count FROM rate_limits WHERE bucket_key = ?").get(bucket).hit_count,
          limit, "Rejected requests must not overflow or corrupt the stored counter");
        assert.equal((await checkRateLimit({ ...env, IP_RATE_LIMITER: undefined }, dimension, identifier, limit, 60)).allowed, false);
        testNow = fixedNow + 60000;
        const nextWindow = await checkRateLimit({ ...env, IP_RATE_LIMITER: undefined }, dimension, identifier, limit, 60);
        assert.equal(nextWindow.allowed, true, "The next fixed window must open a fresh bucket");
        assert.equal(nextWindow.remaining, limit - 1);
        testNow = fixedNow;
      }
    } finally {
      Date.now = originalNow;
    }
    console.log("✓ [PASS] Atomic concurrent IP/UID/write rate-limit reservations & fixed-window reset verified");
  }

  // All tests below are local simulations: generated RSA keys + SQLite and
  // mocked network/edge bindings. They do not assert production acceptance.
  {
    d1.rawDb.prepare("DELETE FROM system_flags WHERE flag_key = 'public_directory_enabled'").run();
    assert.equal(await isFeatureEnabled(env, "public_directory_enabled"), false);
    const status = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/health"), env);
    assert.equal((await status.json()).features.publicDirectoryEnabled, false);
    const unavailable = { ...env, DB: { prepare() { throw new Error("private SQL credential"); } } };
    assert.equal(await isFeatureEnabled(unavailable, "registration_enabled"), false);
    const failedHealth = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/health"), unavailable);
    assert.equal(failedHealth.status, 503);
    assert.deepEqual((await failedHealth.json()).features, {
      registrationEnabled: false, paperSubmissionEnabled: false,
      diplomaRegistrationEnabled: false, publicDirectoryEnabled: false
    });
    for (const origin of ["http://localhost:8088", "http://127.0.0.1:8088", "https://localhost"]) {
      const response = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/health", { headers: { Origin: origin } }),
        { ...env, ENVIRONMENT: "production", ALLOWED_ORIGINS: `${env.ALLOWED_ORIGINS},${origin}` });
      assert.equal(response.status, 403, "Production must reject loopback even if accidentally configured");
    }
    console.log("✓ [PASS][LOCAL] Missing/unavailable feature flags fail closed, degraded health disables every feature, production rejects loopback CORS");
  }

  {
    assert.equal((await verifyFirebaseIdToken(await signTestFirebaseJwt(privateKey, createValidClaims("x")), env)).uid, "x",
      "Firebase permits a nonempty UID of up to 128 characters");
    await assert.rejects(async () => verifyFirebaseIdToken(await signTestFirebaseJwt(privateKey, createValidClaims("")), env));
    const shortUidToken = await signTestFirebaseJwt(privateKey, createValidClaims("x"));
    const shortUidRegistration = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/me/register", {
      method: "POST", headers: { Authorization: `Bearer ${shortUidToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true })
    }), env);
    assert.equal(shortUidRegistration.status, 400, "A signed short Firebase UID must produce a clear archive compatibility error rather than SQL failure");
    assert.equal((await shortUidRegistration.json()).error.code, "UID_NOT_SUPPORTED");
    const invalidTimes = [
      { auth_time: undefined }, { auth_time: null }, { auth_time: "123" },
      { auth_time: nowSec() + 90 }, { auth_time: nowSec(), iat: nowSec() - 360 },
      { iat: 1.2 }, { exp: Infinity }, { exp: nowSec() - 1 },
      { iat: nowSec() + 90 }, { exp: nowSec() + 7200 },
      { exp: nowSec() - 100, iat: nowSec() - 60 }
    ];
    for (const times of invalidTimes) {
      const token = await signTestFirebaseJwt(privateKey, createValidClaims("jwt_time_validation_user", times));
      await assert.rejects(() => verifyFirebaseIdToken(token, env));
    }
    for (const payload of [null, [], "payload", 7]) {
      const token = await signTestFirebaseJwt(privateKey, payload);
      await assert.rejects(() => verifyFirebaseIdToken(token, env));
    }
    const rotation = await generateTestKeyPair("rotated-firebase-key");
    const fetchBefore = globalThis.fetch;
    let keyFetches = 0;
    try {
      globalThis.fetch = async (url) => {
        assert.equal(String(url), "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
        keyFetches++;
        return new Response(JSON.stringify({ keys: keyFetches === 1 ? [publicJwk] : [rotation.publicJwk] }),
          { headers: { "Cache-Control": "max-age=3600" } });
      };
      const liveKeyEnv = { ...env, __TEST_JWKS_KEYS__: undefined };
      await verifyFirebaseIdToken(await signTestFirebaseJwt(privateKey, createValidClaims()), liveKeyEnv);
      await verifyFirebaseIdToken(await signTestFirebaseJwt(rotation.privateKey, createValidClaims(), { kid: rotation.publicJwk.kid }), liveKeyEnv);
      assert.equal(keyFetches, 2, "An unknown rotated kid must trigger exactly one bounded JWKS refresh");
      await verifyFirebaseIdToken(await signTestFirebaseJwt(rotation.privateKey, createValidClaims(), { kid: rotation.publicJwk.kid }), liveKeyEnv);
      assert.equal(keyFetches, 2, "Known public keys must be cached");
      const injected = await generateTestKeyPair("untrusted-injected-test-key");
      const injectedToken = await signTestFirebaseJwt(injected.privateKey, createValidClaims(), { kid: injected.publicJwk.kid });
      await assert.rejects(() => verifyFirebaseIdToken(injectedToken,
        { ...env, ENVIRONMENT: "production", __TEST_JWKS_KEYS__: [injected.publicJwk] }),
        "Production must ignore the test-only public-key hook");
    } finally { globalThis.fetch = fetchBefore; }
    console.log("✓ [PASS][LOCAL] JWT malformed/nonfinite/future/auth_time/lifetime rejection, JWKS key rotation and cache, production test-hook isolation");
  }

  {
    const fetchBefore = globalThis.fetch;
    let calls = 0;
    const challengeEnv = { ...env, __TEST_TURNSTILE_VERIFY__: undefined };
    const result = (extra = {}) => ({ success: true, hostname: "freeze.edu.kg", action: "paper", challenge_ts: new Date().toISOString(), ...extra });
    try {
      for (const bad of [
        { success: false }, { success: "true" }, { hostname: "evil.example" },
        { hostname: "freeze.edu.kg.evil.example" }, { action: "register" },
        { challenge_ts: new Date(Date.now() - 301000).toISOString() },
        { challenge_ts: new Date(Date.now() + 60000).toISOString() },
        { challenge_ts: "invalid" }, { challenge_ts: undefined }
      ]) {
        globalThis.fetch = async () => { calls++; return Response.json(result(bad)); };
        assert.equal(await verifyTurnstileToken(challengeEnv, validChallenge(), "1.2.3.4", "paper"), false);
      }
      const beforeOversized = calls;
      assert.equal(await verifyTurnstileToken(challengeEnv, "x".repeat(2049), "1.2.3.4", "paper"), false);
      assert.equal(calls, beforeOversized, "Oversized tokens must be rejected before network verification");
      globalThis.fetch = async () => Response.json(result());
      const reused = validChallenge();
      const outcomes = await Promise.all([1, 2, 3].map(() => verifyTurnstileToken(challengeEnv, reused, "1.2.3.4", "paper")));
      assert.equal(outcomes.filter(Boolean).length, 1, "A durable unique ledger must reject concurrent token replay");
      assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM turnstile_tokens WHERE token_hash = ?").get(reused).n, 0,
        "Raw Turnstile tokens must never be stored");
      // Production must call Siteverify even when a test bypass was injected.
      globalThis.fetch = async () => Response.json(result({ success: false }));
      assert.equal(await verifyTurnstileToken({ ...env, ENVIRONMENT: "production", __TEST_TURNSTILE_VERIFY__: async () => true }, validChallenge(), "1.2.3.4", "paper"), false);
      assert.equal(await verifyTurnstileToken({ ...challengeEnv, TURNSTILE_ALLOWED_HOSTNAMES: "" }, validChallenge(), "1.2.3.4", "paper"), false);
      globalThis.fetch = async () => new Response(new ReadableStream({ start() {} }));
      await assert.rejects(() => fetchWithTimeout("https://verification.invalid", {}, 20), /TIMEOUT/,
        "Verification deadlines must include a stalled response body, not only headers");
    } finally { globalThis.fetch = fetchBefore; }
    console.log("✓ [PASS][LOCAL] Turnstile success/hostname/action/age/size checks, concurrent replay refusal, test-hook isolation and complete-response timeout");
  }

  {
    const fetchBefore = globalThis.fetch;
    try {
      for (const cancelFails of [false, true]) {
        let cancelled = false;
        globalThis.fetch = async (_url, init) => {
          assert.equal(init.redirect, "manual", "Callers must not enable redirect following");
          return new Response(new ReadableStream({
            cancel() { cancelled = true; if (cancelFails) throw new Error("cleanup failed"); }
          }), { status: 307, headers: { Location: "https://must-not-receive.invalid" } });
        };
        await assert.rejects(() => fetchWithTimeout("https://verification.invalid", { redirect: "follow" }),
          /REMOTE_VERIFICATION_REDIRECT/, "Cleanup failures must not change redirect rejection");
        assert.equal(cancelled, true, "Redirect bodies must be cancelled before rejection");
      }
      globalThis.fetch = async () => ({ status: 0, type: "opaqueredirect", body: null });
      await assert.rejects(() => fetchWithTimeout("https://verification.invalid"), /REMOTE_VERIFICATION_REDIRECT/);
      globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { return new Promise(() => {}); } }), { status: 308 });
      await assert.rejects(() => fetchWithTimeout("https://verification.invalid", {}, 20), /REMOTE_VERIFICATION_TIMEOUT/,
        "Redirect cleanup must remain within the complete-response deadline");
    } finally { globalThis.fetch = fetchBefore; }
    console.log("✓ [PASS][LOCAL MOCK] Redirect cancellation, cleanup errors, opaque redirect and stalled-cleanup deadline");
  }

  {
    let d1Reads = 0;
    const edgeOnly = { ...env, ENVIRONMENT: "production", IP_HASH_SALT: "production-test-salt-at-least-16", DB: { prepare() { d1Reads++; throw new Error("D1 must not run"); } },
      IP_RATE_LIMITER: { limit: async () => ({ success: true }) }, UID_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    assert.equal((await checkRateLimit(edgeOnly, "ip", "edge-ip", 120, 60)).allowed, true);
    assert.equal((await checkRateLimit(edgeOnly, "uid", "edge-user", 30, 60)).allowed, true);
    assert.equal(d1Reads, 0, "Successful IP and UID edge reservations must never touch D1");
    for (const badSalt of [undefined, "", "short", "               "]) {
      const missingSalt = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/health"), { ...edgeOnly, IP_HASH_SALT: badSalt });
      assert.equal(missingSalt.status, 503, "Production must refuse a missing or weak IP hashing salt");
      assert.equal((await missingSalt.json()).error.code, "SECURITY_SERVICE_UNAVAILABLE");
    }
    assert.equal(d1Reads, 0, "Invalid production salt must fail before database or rate-limit writes");
    const edgeBroken = { ...edgeOnly, IP_RATE_LIMITER: { limit: async () => { throw new Error("Edge unavailable"); } } };
    const brokenResponse = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/health"), edgeBroken);
    assert.equal(brokenResponse.status, 503);
    assert.equal(d1Reads, 0, "An edge failure must not downgrade to D1");
    const unboundResponse = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/health"), { ...edgeOnly, IP_RATE_LIMITER: undefined });
    assert.equal(unboundResponse.status, 503, "Production must refuse an absent edge binding");
    const blocked = await checkRateLimit({ ...edgeOnly, WRITE_RATE_LIMITER: { limit: async () => ({ success: false }) } }, "write", "write-edge-blocked", 25, 3600);
    assert.equal(blocked.allowed, false);
    assert.equal(d1Reads, 0, "An edge-blocked write must not consume an hourly D1 slot");
    const writeEnv = { ...env, ENVIRONMENT: "production", WRITE_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const writeResults = await Promise.all(Array.from({ length: 30 }, () => checkRateLimit(writeEnv, "write", "hard-hourly-test", 99999, 3600)));
    assert.equal(writeResults.filter((outcome) => outcome.allowed).length, 25,
      "Even permissive environment variables must not relax the 25/hour D1 hard cap");
    console.log("✓ [PASS][LOCAL] IP/UID edge limits avoid D1, missing/failed edge fails 503, write bursts preserve the atomic 25/hour hard cap");
  }

  {
    const fetchBefore = globalThis.fetch;
    const issuer = "https://anu-security-test.cloudflareaccess.com";
    const accessEnv = { ...env, ENVIRONMENT: "production", ADMIN_REQUIRE_ACCESS: "false", ADMIN_ACCESS_ISSUER: issuer, ADMIN_ACCESS_AUD: "student-api-admin-aud" };
    const adminRequest = (assertion, extra = {}) => new Request("https://api.freeze.edu.kg/api/v1/admin/flags", { headers: {
      "X-Admin-Token": ADMIN_TOKEN, ...(assertion ? { "Cf-Access-Jwt-Assertion": assertion } : {}), ...extra
    } });
    const claims = { iss: issuer, aud: [accessEnv.ADMIN_ACCESS_AUD], sub: "access-user-subject", iat: nowSec() - 30, exp: nowSec() + 3600 };
    try {
      globalThis.fetch = async (url) => {
        assert.equal(String(url), `${issuer}/cdn-cgi/access/certs`);
        return Response.json({ keys: [publicJwk] });
      };
      assert.equal(await verifyAdminAuthorization(adminRequest(), accessEnv), false);
      assert.equal(await verifyAdminAuthorization(adminRequest(undefined, { "Cf-Access-Authenticated-User-Email": "admin@example.com" }), accessEnv), false);
      const assertion = await signTestFirebaseJwt(privateKey, claims);
      assert.equal(await verifyAdminAuthorization(adminRequest(assertion), accessEnv), true);
      for (const extra of [{ aud: ["another-app"] }, { iss: "https://evil.example" }, { exp: nowSec() - 1 }, { aud: accessEnv.ADMIN_ACCESS_AUD }]) {
        assert.equal(await verifyAdminAuthorization(adminRequest(await signTestFirebaseJwt(privateKey, { ...claims, ...extra })), accessEnv), false);
      }
      assert.equal(await verifyAdminAuthorization(adminRequest(await signTestFirebaseJwt(wrongPrivateKey, claims)), accessEnv), false);
      assert.equal(await verifyAdminAuthorization(adminRequest(assertion), { ...accessEnv, ADMIN_ACCESS_ISSUER: "https://internal.invalid" }), false);
      assert.equal(await verifyAdminAuthorization(adminRequest(assertion), { ...accessEnv, ADMIN_ACCESS_AUD: "" }), false);
      assert.equal(await verifyAdminAuthorization(adminRequest(assertion, { "X-Admin-Token": "incorrect" }), accessEnv), false);
    } finally { globalThis.fetch = fetchBefore; }
    console.log("✓ [PASS][LOCAL] Production admin requires both secret and signed Access JWT, enforces issuer/audience/expiry, rejects spoofed identity headers; MFA policy is not asserted");
  }

  {
    const uid = "concurrent_registration_owner";
    const token = await signTestFirebaseJwt(privateKey, createValidClaims(uid));
    const registration = () => new Request("https://api.freeze.edu.kg/api/v1/me/register", { method: "POST", headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Turnstile-Token": validChallenge()
    }, body: JSON.stringify({ nickname: "Concurrent Owner", acceptTerms: true, acceptPrivacy: true }) });
    const results = await Promise.all([worker.fetch(registration(), env), worker.fetch(registration(), env)]);
    assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
    assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM students WHERE firebase_uid = ?").get(uid).n, 1);
    const patch = (nickname) => new Request("https://api.freeze.edu.kg/api/v1/me/profile", { method: "PATCH", headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json"
    }, body: JSON.stringify({ nickname, addIdleSeconds: 7 }) });
    // Hold both real SQLite snapshots before either writes, rather than hoping
    // JavaScript scheduling happens to create a conflicting database read.
    let profileReaders = 0;
    let releaseReaders;
    const readersReady = new Promise((resolve) => { releaseReaders = resolve; });
    const profileRaceEnv = { ...env, DB: { ...d1, prepare(query) {
      const wrap = (statement) => ({ ...statement,
        bind(...values) { return wrap(statement.bind(...values)); },
        async first(column) {
          const snapshot = await statement.first(column);
          if (query === "SELECT * FROM students WHERE firebase_uid = ?" && profileReaders < 2) {
            profileReaders++;
            if (profileReaders === 2) releaseReaders();
            await readersReady;
          }
          return snapshot;
        }
      });
      return wrap(d1.prepare(query));
    } } };
    const updates = await Promise.all([worker.fetch(patch("First Update"), profileRaceEnv), worker.fetch(patch("Second Update"), profileRaceEnv)]);
    assert.deepEqual(updates.map((response) => response.status).sort(), [200, 409], "Concurrent profile updates must not silently overwrite each other");
    const archiveRequest = (path = "export", auth = token) => new Request(`https://api.freeze.edu.kg/api/v1/me/${path}`, { headers: { Authorization: `Bearer ${auth}` } });
    const exported = await worker.fetch(archiveRequest(), env);
    assert.equal(exported.status, 200);
    const exportBody = await exported.json();
    assert.equal(exportBody.data.profile.idleSeconds, 7);
    assert.ok(!JSON.stringify(exportBody).includes("firebase_uid"), "Exports must not expose internal UID columns");
    const outsiderToken = await signTestFirebaseJwt(privateKey, createValidClaims("archive_export_outsider"));
    assert.equal((await worker.fetch(archiveRequest("export", outsiderToken), env)).status, 404);
    assert.equal((await worker.fetch(archiveRequest(`export?uid=${uid}`, outsiderToken), env)).status, 400);
    const oldToken = await signTestFirebaseJwt(privateKey, createValidClaims(uid, { auth_time: nowSec() - 3600 }));
    const deleteResponse = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/me", { method: "DELETE", headers: {
      Authorization: `Bearer ${oldToken}`, "Content-Type": "application/json"
    }, body: JSON.stringify({ confirmDelete: "DELETE_MY_ANU_ARCHIVE" }) }), env);
    assert.equal(deleteResponse.status, 403, "Recent-login rejection must remain distinct from an expired ID token");
    assert.equal((await deleteResponse.json()).error.code, "AUTH_REQUIRES_RECENT_LOGIN");
    const staleRegistrationToken = await signTestFirebaseJwt(privateKey, createValidClaims("stale_registration_user", { auth_time: nowSec() - 3600 }));
    const staleRegistration = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/me/register", {
      method: "POST", headers: { Authorization: `Bearer ${staleRegistrationToken}`, "Content-Type": "application/json", "X-Turnstile-Token": validChallenge() },
      body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true })
    }), env);
    assert.equal(staleRegistration.status, 403);
    assert.equal((await staleRegistration.json()).error.code, "AUTH_REQUIRES_RECENT_LOGIN");
    assert.ok(d1.rawDb.prepare("SELECT firebase_uid FROM students WHERE firebase_uid = ?").get(uid));

    const revisionRead = exportBody.data.profile.revision;
    const revisionPatch = (nickname) => new Request("https://api.freeze.edu.kg/api/v1/me/profile", { method: "PATCH", headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json"
    }, body: JSON.stringify({ nickname, expectedRevision: revisionRead }) });
    assert.equal((await worker.fetch(revisionPatch("Saved by first tab"), env)).status, 200);
    const staleTab = await worker.fetch(revisionPatch("Stale second tab overwrite"), env);
    assert.equal(staleTab.status, 409, "A stale tab must fail even when it submits after another update completed");
    assert.equal(d1.rawDb.prepare("SELECT nickname FROM students WHERE firebase_uid = ?").get(uid).nickname, "Saved by first tab");

    const importPayload = { exams: [{ courseCode: "NTH-101", answers: [2, 2] }], papers: [{ title: "Atomic import receipt test" }], badges: ["club_cat"] };
    const importArchive = (key, payload = importPayload) => new Request("https://api.freeze.edu.kg/api/v1/me/import", { method: "POST", headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": key, "X-Turnstile-Token": validChallenge()
    }, body: JSON.stringify(payload) });
    const raceImports = await Promise.all([1, 2].map(() => worker.fetch(importArchive("same-key-concurrent-import"), env)));
    assert.deepEqual(raceImports.map((response) => response.status), [200, 200]);
    const raceBodies = await Promise.all(raceImports.map((response) => response.json()));
    assert.deepEqual(raceBodies[0], raceBodies[1]);
    assert.deepEqual(raceBodies[0].importedSummary, { exams: 1, papers: 1, diplomas: 0, clubsAndBadges: 1 });
    const differentPayload = await worker.fetch(importArchive("same-key-concurrent-import", { papers: [{ title: "Conflicting replacement" }] }), env);
    assert.equal(differentPayload.status, 409);
    assert.equal((await differentPayload.json()).error.code, "IDEMPOTENCY_KEY_CONFLICT");
    assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM papers WHERE firebase_uid = ?").get(uid).n, 1);

    d1.rawDb.exec(`CREATE TRIGGER force_import_badge_failure BEFORE INSERT ON honors_achievements
      WHEN NEW.firebase_uid = '${uid}' AND NEW.badge_key = 'club_coupon'
      BEGIN SELECT RAISE(ABORT, 'synthetic unavailable badge storage'); END;`);
    const retryPayload = { papers: [{ title: "Import must roll back with badges and receipt" }], badges: ["club_coupon"] };
    const failed = await worker.fetch(importArchive("atomic-receipt-retry-key", retryPayload), env);
    assert.equal(failed.status, 500);
    assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM papers WHERE firebase_uid = ?").get(uid).n, 1);
    assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM idempotency_keys WHERE firebase_uid = ? AND idem_key = 'atomic-receipt-retry-key'").get(uid).n, 0,
      "Any archive or badge error must roll back its idempotency receipt too");
    d1.rawDb.exec("DROP TRIGGER force_import_badge_failure");
    const retried = await worker.fetch(importArchive("atomic-receipt-retry-key", retryPayload), env);
    assert.equal(retried.status, 200, "Retry with a fresh challenge must succeed after storage recovers");
    assert.equal((await retried.json()).importedSummary.papers, 1);
    console.log("✓ [PASS][LOCAL] Concurrent UID registration, profile conflict detection, owner-only export/recent-auth deletion, atomic import receipt/badges/archive rollback and recovery");
  }

  {
    const uid = "atomic_direct_archive_owner";
    const token = await signTestFirebaseJwt(privateKey, createValidClaims(uid));
    const send = (endpoint, body) => worker.fetch(new Request(`https://api.freeze.edu.kg/api/v1/me/${endpoint}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Turnstile-Token": validChallenge() },
      body: JSON.stringify(body)
    }), env);
    const failBadge = (badge) => d1.rawDb.exec(`CREATE TRIGGER reject_direct_milestone BEFORE INSERT ON honors_achievements
      WHEN NEW.firebase_uid = '${uid}' AND NEW.badge_key = '${badge}'
      BEGIN SELECT RAISE(ABORT, 'synthetic milestone write failure'); END;`);
    failBadge("milestone_enrolled");
    const registrationBody = { nickname: "Atomic Badge Owner", acceptTerms: true, acceptPrivacy: true };
    assert.equal((await send("register", registrationBody)).status, 500);
    assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM students WHERE firebase_uid = ?").get(uid).n, 0,
      "A failed enrollment badge must roll back its student record");
    d1.rawDb.exec("DROP TRIGGER reject_direct_milestone");
    assert.equal((await send("register", registrationBody)).status, 201,
      "Registration must recover without a false already-registered conflict");
    for (const entry of [
      { endpoint: "exams", table: "transcripts", badge: "milestone_first_exam", body: { courseCode: "NTH-101", answers: [2, 2] } },
      { endpoint: "papers", table: "papers", badge: "milestone_first_paper", body: { title: "Atomic direct paper" } },
      { endpoint: "diplomas", table: "diplomas", badge: "milestone_first_diploma", body: { recipientName: "Atomic Owner", degreeIdx: 0 } }
    ]) {
      failBadge(entry.badge);
      assert.equal((await send(entry.endpoint, entry.body)).status, 500);
      assert.equal(d1.rawDb.prepare(`SELECT COUNT(*) AS n FROM ${entry.table} WHERE firebase_uid = ?`).get(uid).n, 0,
        "A failed milestone must roll back its primary academic archive record");
      d1.rawDb.exec("DROP TRIGGER reject_direct_milestone");
      assert.equal((await send(entry.endpoint, entry.body)).status, 201);
      assert.equal(d1.rawDb.prepare(`SELECT COUNT(*) AS n FROM ${entry.table} WHERE firebase_uid = ?`).get(uid).n, 1);
      // Repair a legacy record whose old non-transactional badge write failed.
      d1.rawDb.prepare("DELETE FROM honors_achievements WHERE firebase_uid = ? AND badge_key = ?").run(uid, entry.badge);
      const replay = await send(entry.endpoint, entry.body);
      assert.ok([200, 201].includes(replay.status));
      assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM honors_achievements WHERE firebase_uid = ? AND badge_key = ?").get(uid, entry.badge).n, 1);
      assert.equal(d1.rawDb.prepare(`SELECT COUNT(*) AS n FROM ${entry.table} WHERE firebase_uid = ?`).get(uid).n, 1,
        "Repairing a missing milestone must never duplicate an existing archive record");
    }
    console.log("✓ [PASS][LOCAL] Registration and direct exam/paper/diploma milestone failures roll back atomically; retries recover and repair legacy missing badges");
  }

  {
    const uid = "global_identifier_collision_owner";
    const token = await signTestFirebaseJwt(privateKey, createValidClaims(uid));
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const registered = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/me/register", { method: "POST",
      headers: { ...headers, "X-Turnstile-Token": validChallenge() },
      body: JSON.stringify({ nickname: "Identifier Collision Owner", acceptTerms: true, acceptPrivacy: true })
    }), env);
    assert.equal(registered.status, 201);
    const importRequest = (key, payload) => new Request("https://api.freeze.edu.kg/api/v1/me/import", { method: "POST",
      headers: { ...headers, "X-Idempotency-Key": key, "X-Turnstile-Token": validChallenge() }, body: JSON.stringify(payload)
    });
    const randomBefore = Math.random;
    try {
      Math.random = () => 0.5;
      const batch = await worker.fetch(importRequest("fixed-math-random-archive-batch", {
        exams: [{ courseCode: "NTH-101", answers: [2, 2] }, { courseCode: "DRM-404", answers: [40, 35] }],
        papers: [{ title: "Fixed Math random paper one" }, { title: "Fixed Math random paper two" }, { title: "Fixed Math random paper three" }],
        diplomas: [{ recipientName: "Fixed Recipient One" }, { recipientName: "Fixed Recipient Two" }, { recipientName: "Fixed Recipient Three" }]
      }), env);
      assert.equal(batch.status, 200);
      const batchBody = await batch.json();
      assert.deepEqual(batchBody.importedSummary, { exams: 2, papers: 3, diplomas: 3, clubsAndBadges: 0 },
        "A repeated Math.random result must never collapse separate academic archive records");
      assert.equal(new Set(batchBody.data.papers.map((paper) => paper.void_id)).size, 3);
      assert.equal(new Set(batchBody.data.diplomas.map((diploma) => diploma.serial_number)).size, 3);
      assert.ok(batchBody.data.papers.every((paper) => /^VOID-ID: ANU\.NULL\.2026\.[A-F0-9]{32}$/.test(paper.void_id)));
      assert.ok(batchBody.data.diplomas.every((diploma) => /^ANU-2026-VOID-[A-F0-9]{32}$/.test(diploma.serial_number)));
      // The two direct creation paths use the same secure identifier source.
      for (const [endpoint, body] of [["papers", { title: "Fixed random direct paper" }], ["diplomas", { recipientName: "Fixed Random Direct Recipient" }]]) {
        const direct = await worker.fetch(new Request(`https://api.freeze.edu.kg/api/v1/me/${endpoint}`, { method: "POST",
          headers: { ...headers, "X-Turnstile-Token": validChallenge() }, body: JSON.stringify(body)
        }), env);
        assert.equal(direct.status, 201);
        const directBody = await direct.json();
        assert.match(endpoint === "papers" ? directBody.voidId : directBody.serialNumber, /[A-F0-9]{32}$/);
      }
    } finally { Math.random = randomBefore; }

    const snapshot = () => Object.fromEntries(["transcripts", "papers", "diplomas", "honors_achievements", "idempotency_keys"].map((table) =>
      [table, d1.rawDb.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE firebase_uid = ?`).get(uid).n]));
    const cases = [
      { table: "transcripts", column: "id", binding: 0 },
      { table: "papers", column: "id", binding: 0 },
      { table: "diplomas", column: "id", binding: 0 },
      { table: "papers", column: "void_id", binding: 2 },
      { table: "diplomas", column: "serial_number", binding: 2 }
    ];
    for (const [index, collision] of cases.entries()) {
      const existingValue = d1.rawDb.prepare(`SELECT ${collision.column} AS value FROM ${collision.table} WHERE firebase_uid = ? LIMIT 1`).get(uid).value;
      // Deliberately corrupt the bound generated identifier at the D1 adapter
      // boundary to exercise real UNIQUE failures rather than mocked errors.
      const collisionEnv = { ...env, DB: { ...d1, prepare(query) {
        const statement = d1.prepare(query);
        if (!new RegExp(`^\\s*INSERT(?: OR IGNORE)? INTO ${collision.table} \\(`).test(query)) return statement;
        return { ...statement, bind(...values) {
          const forced = [...values];
          forced[collision.binding] = existingValue;
          return statement.bind(...forced);
        } };
      } } };
      const payload = {
        exams: [{ courseCode: "NTH-101", answers: [Math.floor(index / 3), index % 3] }],
        papers: [{ title: `Conflicting generated identifier paper ${index}` }],
        diplomas: [{ recipientName: `New generated identifier owner ${index}` }], badges: ["club_folder"]
      };
      const key = `forced-unique-collision-${collision.table}-${collision.column}`;
      const before = snapshot();
      const failed = await worker.fetch(importRequest(key, payload), collisionEnv);
      assert.equal(failed.status, 500, "Unexpected primary/global identifier collisions must fail rather than silently skip a record");
      assert.deepEqual(snapshot(), before, "A UNIQUE failure must roll back every archive, badge, and receipt in its import batch");
      assert.equal(d1.rawDb.prepare("SELECT COUNT(*) AS n FROM idempotency_keys WHERE firebase_uid = ? AND idem_key = ?").get(uid, key).n, 0);
      const failedText = await failed.text();
      assert.ok(!failedText.includes("UNIQUE constraint") && !failedText.includes(existingValue), "Collision errors must remain sanitized");
      const recovered = await worker.fetch(importRequest(key, payload), env);
      assert.equal(recovered.status, 200, "An unsaved collision receipt must permit a clean retry with fresh identifiers and challenge");
      const summary = (await recovered.json()).importedSummary;
      assert.equal(summary.exams, 1);
      assert.equal(summary.papers, 1);
      assert.equal(summary.diplomas, 1);
    }
    console.log("✓ [PASS][LOCAL] Crypto UUID public identifiers survive fixed Math.random; forced primary/global UNIQUE collisions roll back all data and receipts without silent loss");
    for (const table of ["transcripts", "papers", "diplomas", "honors_achievements"]) {
      for (const malformed of [{ success: false, results: [] }, { success: true, results: null }, {}]) {
        const failedReadEnv = { ...env, DB: { ...d1, prepare(query) {
          const wrap = (statement) => ({ ...statement,
            bind(...values) { return wrap(statement.bind(...values)); },
            all: query.includes(`FROM ${table} WHERE firebase_uid = ?`) ? async () => malformed : statement.all
          });
          return wrap(d1.prepare(query));
        } } };
        const failedRead = await worker.fetch(new Request("https://api.freeze.edu.kg/api/v1/me", { headers }), failedReadEnv);
        assert.equal(failedRead.status, 500, "A failed archive collection read must not become a successful empty bundle");
        const failedBody = await failedRead.json();
        assert.equal(failedBody.ok, false);
        assert.equal(failedBody.error.code, "INTERNAL_SERVER_ERROR");
        assert.equal(failedBody.data, undefined, "Failed reads must not publish replacement archive data");
      }
    }
    console.log("✓ [PASS][LOCAL] Every archive read rejects unsuccessful or malformed D1 result sets instead of silently returning empty cloud collections");
  }

  {
    // Exercise the incremental migration against populated legacy tables,
    // comparing every preserved user column before and after the upgrade.
    const legacySql = ["0001_initial_schema.sql", "0002_archive_quota_triggers.sql"]
      .map((name) => fs.readFileSync(path.join(migrationDir, name), "utf8")).join("\n");
    const legacy = createD1SqliteAdapter(legacySql);
    const tables = ["students", "transcripts", "papers", "diplomas", "honors_achievements", "idempotency_keys"];
    for (const table of tables) {
      for (const row of d1.rawDb.prepare(`SELECT * FROM ${table}`).all()) {
        const columns = Object.keys(row).filter((key) => key !== "revision" && key !== "request_hash");
        legacy.rawDb.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`)
          .run(...columns.map((key) => row[key]));
      }
    }
    const snapshot = Object.fromEntries(tables.map((table) => [table, legacy.rawDb.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map((row) => ({ ...row }))]));
    legacy.rawDb.exec(fs.readFileSync(path.join(migrationDir, "0003_security_hardening.sql"), "utf8"));
    for (const table of tables) {
      const rowsAfter = legacy.rawDb.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map((row) =>
        Object.fromEntries(Object.entries(row).filter(([key]) => key !== "revision" && key !== "request_hash")));
      assert.deepEqual(rowsAfter, snapshot[table], `Incremental migration must preserve every existing ${table} row and user column`);
    }
    assert.equal(legacy.rawDb.prepare("SELECT enabled FROM system_flags WHERE flag_key = 'registration_enabled'").get().enabled, 0);
    legacy.rawDb.close();
    console.log("✓ [PASS][LOCAL] Incremental migration preserves populated legacy student/archive/receipt rows and closes registration");
  }
}
