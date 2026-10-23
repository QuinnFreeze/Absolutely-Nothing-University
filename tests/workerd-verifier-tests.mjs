import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
// Use Wrangler's locked runtime/bundler, including when npm nests dependencies.
const runtimeRequire = createRequire(path.join(root, "worker/node_modules/wrangler/package.json"));
const { Miniflare, convertV4MiniflareOptions } = runtimeRequire("miniflare");
const { build } = runtimeRequire("esbuild");
const project = "anu-local-runtime-fixture";
const issuer = "https://runtime-fixture.cloudflareaccess.com";
const audience = "runtime-admin-fixture";
const adminSecret = "synthetic-local-admin-secret-not-a-credential";
const turnstileSecret = "synthetic-local-turnstile-secret";
const googleKeys = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const siteverify = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function runWorkerdVerifierTests() {
  // Private signing keys exist only in memory; no real tokens or provider calls.
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const { privateKey: wrongKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "runtime-fixture-key", alg: "RS256", use: "sig" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: project, iss: `https://securetoken.google.com/${project}`, sub: "synthetic-fixture-user",
    iat: now - 5, exp: now + 3595, auth_time: now - 5, firebase: { sign_in_provider: "google.com" }
  };
  const accessClaims = { aud: [audience], iss: issuer, sub: "synthetic-admin", iat: now - 5, exp: now + 1795 };
  function token(payload, key = privateKey) {
    const parts = [{ alg: "RS256", typ: "JWT", kid: jwk.kid }, payload]
      .map(value => Buffer.from(JSON.stringify(value)).toString("base64url"));
    const signed = parts.join(".");
    return `${signed}.${sign("RSA-SHA256", Buffer.from(signed), key).toString("base64url")}`;
  }
  const source = `
    import { verifyFirebaseIdToken } from './worker/src/middleware/firebaseAuth.ts';
    import { verifyTurnstileToken, verifyAdminAuthorization } from './worker/src/middleware/security.ts';
    import { fetchWithTimeout } from './worker/src/utils/jwt.ts';
    export default { async fetch(request, bindings) {
      const env = { ...bindings, ENVIRONMENT: 'production', FIREBASE_PROJECT_ID: '${project}',
        ADMIN_API_TOKEN: '${adminSecret}', ADMIN_ACCESS_ISSUER: '${issuer}', ADMIN_ACCESS_AUD: '${audience}',
        TURNSTILE_SECRET_KEY: '${turnstileSecret}', TURNSTILE_ALLOWED_HOSTNAMES: 'freeze.edu.kg' };
      const input = await request.json();
      try {
        switch (new URL(request.url).pathname) {
          case '/firebase': {
            const user = await verifyFirebaseIdToken(input.token, env);
            return Response.json({ ok: true, uid: user.uid });
          }
          case '/admin': return Response.json({ ok: await verifyAdminAuthorization(new Request('https://local.test/admin', {
            headers: { 'X-Admin-Token': input.secret || '', 'Cf-Access-Jwt-Assertion': input.token || '' }
          }), env) });
          case '/turnstile': return Response.json({ ok: await verifyTurnstileToken(env, input.token, '192.0.2.1', 'paper') });
          case '/fetch': {
            const response = await fetchWithTimeout(input.url, {
              method: input.method || 'GET', redirect: 'follow',
              ...(input.method === 'POST' ? { body: 'synthetic-secret=do-not-forward' } : {})
            }, 1000);
            return Response.json({ ok: true, status: response.status, text: await response.text() });
          }
          default: throw new Error('UNKNOWN_TEST_ROUTE');
        }
      } catch (error) { return Response.json({ ok: false, code: error.code || error.message }); }
    } };`;
  const bundled = await build({
    stdin: { contents: source, resolveDir: root, sourcefile: "workerd-verifier-fixture.ts" },
    bundle: true, write: false, format: "esm", platform: "browser", target: "es2022"
  });
  const temp = await mkdtemp(path.join(tmpdir(), "anu-workerd-verifier-"));
  let mode = "redirect";
  let upstreamStatus = 302;
  let challengeOverrides = {};
  const calls = [];
  let forbiddenTargetCalls = 0;
  let runtime;
  try {
    runtime = new Miniflare(convertV4MiniflareOptions({
      rootPath: temp, modules: true, script: bundled.outputFiles[0].text,
      compatibilityDate: "2026-01-01", host: "127.0.0.1", port: 0, d1Databases: ["DB"],
      telemetry: { enabled: false },
      outboundService: async request => {
        const url = new URL(request.url);
        const body = await request.text();
        calls.push({ url: request.url, method: request.method, body });
        if (url.hostname === "must-not-receive.invalid") {
          forbiddenTargetCalls++;
          return new Response("redirect target must never receive a request", { status: 500 });
        }
        assert.ok([googleKeys, siteverify, `${issuer}/cdn-cgi/access/certs`].includes(request.url) ||
          url.hostname === "verification.invalid", "No fixture request may escape the upstream allowlist");
        if (mode === "redirect") return new Response(upstreamStatus === 304 ? null : "redirect body", {
          status: upstreamStatus, headers: { Location: "https://must-not-receive.invalid/collect" }
        });
        if (mode === "error") return new Response("upstream unavailable", { status: upstreamStatus });
        if (mode === "oversized") return new Response("x".repeat(65537));
        if (request.url === siteverify) {
          assert.equal(request.method, "POST");
          const form = new URLSearchParams(body);
          assert.equal(form.get("secret"), turnstileSecret);
          assert.equal(form.get("remoteip"), "192.0.2.1");
          assert.ok(form.get("response")?.startsWith("synthetic-challenge-"));
          return Response.json({ success: true, hostname: "freeze.edu.kg", action: "paper",
            challenge_ts: new Date().toISOString(), ...challengeOverrides });
        }
        return Response.json({ keys: [jwk] }, { headers: { "Cache-Control": "max-age=3600" } });
      }
    }));
    const db = await runtime.getD1Database("DB");
    await db.exec("CREATE TABLE turnstile_tokens (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)");
    const request = async (route, input) => {
      const response = await runtime.dispatchFetch(`http://local.test${route}`, {
        method: "POST", body: JSON.stringify(input), headers: { "Content-Type": "application/json" }
      });
      assert.equal(response.status, 200);
      return response.json();
    };
    let cases = 0;
    const firebaseToken = token(claims);
    const adminToken = token(accessClaims);

    // Test failed key loads before the success path populates isolate-local caches.
    for (const status of [301, 302, 303, 304, 307, 308]) {
      upstreamStatus = status;
      assert.equal((await request("/firebase", { token: firebaseToken })).code, "AUTH_VERIFIER_UNAVAILABLE");
      assert.equal((await request("/admin", { token: adminToken, secret: adminSecret })).ok, false);
      assert.equal((await request("/turnstile", { token: `synthetic-challenge-redirect-${status}` })).ok, false);
      cases += 3;
    }
    // All 3xx statuses reject, including bodyless 304. Caller 'follow' cannot win.
    for (let status = 300; status < 400; status++) {
      upstreamStatus = status;
      assert.equal((await request("/fetch", { url: "https://verification.invalid/check", method: "POST" })).code,
        "REMOTE_VERIFICATION_REDIRECT", `Redirect ${status} must fail closed`);
      cases++;
    }
    assert.equal(forbiddenTargetCalls, 0, "Redirects must never forward a POST secret or any request");
    assert.ok(calls.filter(call => call.url === siteverify).every(call => call.method === "POST"));
    mode = "error";
    for (const status of [401, 429, 500]) {
      upstreamStatus = status;
      assert.deepEqual(await request("/fetch", { url: "https://verification.invalid/check" }),
        { ok: true, status, text: "upstream unavailable" });
      assert.equal((await request("/firebase", { token: firebaseToken })).code, "AUTH_VERIFIER_UNAVAILABLE");
      assert.equal((await request("/admin", { token: adminToken, secret: adminSecret })).ok, false);
      assert.equal((await request("/turnstile", { token: `synthetic-challenge-error-${status}` })).ok, false);
      cases += 4;
    }
    mode = "oversized";
    assert.equal((await request("/fetch", { url: "https://verification.invalid/check" })).code, "VERIFICATION_RESPONSE_TOO_LARGE");
    cases++;
    mode = "success";
    const beforeGoogle = calls.filter(call => call.url === googleKeys).length;
    assert.deepEqual(await request("/firebase", { token: firebaseToken }), { ok: true, uid: claims.sub });
    assert.equal((await request("/firebase", { token: token(claims, wrongKey) })).code, "AUTH_BAD_SIGNATURE");
    assert.equal((await request("/firebase", { token: token({ ...claims, aud: "other-project" }) })).code, "AUTH_INVALID_AUD");
    assert.equal((await request("/firebase", { token: token({ ...claims, iss: "https://evil.invalid" }) })).code, "AUTH_INVALID_ISS");
    assert.equal((await request("/firebase", { token: token({ ...claims, exp: now - 1 }) })).code, "AUTH_TOKEN_EXPIRED");
    assert.equal(calls.filter(call => call.url === googleKeys).length - beforeGoogle, 1, "Real runtime caches public keys");
    cases += 5;
    assert.equal((await request("/admin", { token: adminToken, secret: adminSecret })).ok, true);
    assert.equal((await request("/admin", { token: token(accessClaims, wrongKey), secret: adminSecret })).ok, false);
    assert.equal((await request("/admin", { token: adminToken, secret: "wrong-secret" })).ok, false);
    assert.equal((await request("/admin", { secret: adminSecret })).ok, false);
    cases += 4;
    const challenge = "synthetic-challenge-concurrent";
    const consumed = await Promise.all(Array.from({ length: 3 }, () => request("/turnstile", { token: challenge })));
    assert.equal(consumed.filter(value => value.ok).length, 1, "Real local D1 atomically rejects challenge replay");
    for (const overrides of [{ success: false }, { hostname: "evil.invalid" }, { action: "register" },
      { challenge_ts: new Date(Date.now() - 301000).toISOString() }]) {
      challengeOverrides = overrides;
      assert.equal((await request("/turnstile", { token: `synthetic-challenge-bad-${cases}` })).ok, false);
      cases++;
    }
    const ledger = await db.prepare("SELECT token_hash FROM turnstile_tokens").all();
    assert.equal(ledger.results.length, 1, "Rejected challenges never consume ledger entries");
    assert.match(ledger.results[0].token_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(ledger.results[0].token_hash, challenge, "Only the challenge hash is stored");
    assert.equal(forbiddenTargetCalls, 0);
    cases++;
    console.log(`✓ [PASS][LOCAL WORKERD] ${cases} verifier cases: Firebase/Access RSA, all 3xx rejected without forwarding, upstream failures, 64KiB bound, Turnstile + D1 replay`);
  } finally {
    await runtime?.dispose();
    await rm(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runWorkerdVerifierTests();
}
