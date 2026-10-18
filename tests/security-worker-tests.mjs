import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/src/index.ts";
import { checkRateLimit } from "../worker/src/middleware/security.ts";

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
    ADMIN_API_TOKEN: ADMIN_TOKEN,
    IP_HASH_SALT: "test-salt-2026",
    RATE_LIMIT_IP_PER_MIN: "120",
    RATE_LIMIT_UID_PER_MIN: "60",
    RATE_LIMIT_WRITE_PER_HOUR: "40",
    __TEST_JWKS_KEYS__: [publicJwk],
    __TEST_TURNSTILE_VERIFY__: async (token) => token === "VALID_TURNSTILE_TOKEN"
  };

  const nowSec = () => Math.floor(Date.now() / 1000);

  const createValidClaims = (uid = "firebase_uid_student_alice_01", extra = {}) => ({
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    sub: uid,
    user_id: uid,
    iat: nowSec() - 60,
    exp: nowSec() + 3600,
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
    assert.match(paperJson.voidId, /^VOID-ID: ANU\.NULL\.2026\.\d+$/);
    assert.equal(paperJson.data.papers.length, 1);

    // 5c. Diploma Registration with Turnstile
    const dipRes = await worker.fetch(
      new Request("https://api.freeze.edu.kg/api/v1/me/diplomas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          "Content-Type": "application/json",
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          paused.token, `import-paused-${flag}`, mixedPayload, "VALID_TURNSTILE_TOKEN"
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
        student.token, `import-over-quota-${quota.table}`, overQuotaPayload, "VALID_TURNSTILE_TOKEN"
      ), env);
      assert.equal(rejected.status, 429);
      assert.equal((await rejected.json()).error.code, quota.code);
      assert.deepEqual(countsFor(student.uid), before, "Any exceeded quota must reject before all archive/badge writes");

      const atBoundary = await worker.fetch(importRequest(
        student.token, `import-quota-boundary-${quota.table}`,
        { [quota.field]: [quota.first, quota.first] }, "VALID_TURNSTILE_TOKEN"
      ), env);
      assert.equal(atBoundary.status, 200, "Duplicate records in one import consume one quota slot");
      assert.equal((await atBoundary.json()).importedSummary[quota.field], 1);
      assert.equal(countsFor(student.uid)[quota.table], quota.limit);
      const duplicateAtLimit = await worker.fetch(importRequest(
        student.token, `import-quota-duplicate-${quota.table}`,
        { [quota.field]: [quota.first] }, "VALID_TURNSTILE_TOKEN"
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
        { ...mixedPayload, [quota.field]: oversizedRecords }, "VALID_TURNSTILE_TOKEN"
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
      bulk.token, "import-bulk-complete-payload", bulkPayload, "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          { [quota.field]: [payload] }, "VALID_TURNSTILE_TOKEN"), env)
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
        { ...mixedPayload, [quota.field]: [quota.first] }, "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
          "X-Turnstile-Token": "VALID_TURNSTILE_TOKEN"
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
    assert.equal(errRes.status, 500);
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
          checkRateLimit(env, dimension, identifier, limit, 60)
        ));
        assert.equal(reservations.filter((result) => result.allowed).length, limit,
          "Exactly the configured number of concurrent requests may reserve a slot");
        assert.deepEqual(reservations.filter((result) => result.allowed).map((result) => result.remaining).sort(),
          [0, 1, 2, 3, 4, 5, 6], "Each accepted request must own a distinct rate-limit slot");
        const bucket = `${dimension}:${identifier}:${Math.floor(fixedNow / 60000) * 60}`;
        assert.equal(d1.rawDb.prepare("SELECT hit_count FROM rate_limits WHERE bucket_key = ?").get(bucket).hit_count,
          limit, "Rejected requests must not overflow or corrupt the stored counter");
        assert.equal((await checkRateLimit(env, dimension, identifier, limit, 60)).allowed, false);
        testNow = fixedNow + 60000;
        const nextWindow = await checkRateLimit(env, dimension, identifier, limit, 60);
        assert.equal(nextWindow.allowed, true, "The next fixed window must open a fresh bucket");
        assert.equal(nextWindow.remaining, limit - 1);
        testNow = fixedNow;
      }
    } finally {
      Date.now = originalNow;
    }
    console.log("✓ [PASS] Atomic concurrent IP/UID/write rate-limit reservations & fixed-window reset verified");
  }
}

