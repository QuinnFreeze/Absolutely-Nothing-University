import type { Env } from "../types.ts";
import { generateId, sha256Hex, timingSafeEqualStr } from "../utils/crypto.ts";
import { fetchWithTimeout, getSigningKey, isJsonObject, isTimestamp, parseJwt, verifyJwtSignature } from "../utils/jwt.ts";

export class SecurityServiceUnavailable extends Error {}

/** Edge bindings shed request bursts without touching D1. D1 retains the hard hourly write cap. */
export async function checkRateLimit(
  env: Env, dimension: "ip" | "uid" | "write", identifier: string,
  limitCount: number, windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const resetAt = Math.floor(now / windowSeconds) * windowSeconds + windowSeconds;
  const edge = dimension === "ip" ? env.IP_RATE_LIMITER : dimension === "uid" ? env.UID_RATE_LIMITER : env.WRITE_RATE_LIMITER;
  if (edge) {
    let result: { success: boolean };
    try { result = await edge.limit({ key: `${dimension}:${identifier}` }); }
    catch { throw new SecurityServiceUnavailable("RATE_LIMITER_UNAVAILABLE"); }
    if (!result || typeof result.success !== "boolean") throw new SecurityServiceUnavailable("RATE_LIMITER_UNAVAILABLE");
    if (!result.success || dimension !== "write") return { allowed: result.success, remaining: 0, resetAt };
  } else if (env.ENVIRONMENT === "production") {
    throw new SecurityServiceUnavailable("RATE_LIMITER_NOT_CONFIGURED");
  }
  // Bounds cannot be relaxed by malformed/overly permissive runtime variables.
  const ceiling = dimension === "ip" ? 120 : dimension === "uid" ? 30 : 25;
  const safeLimit = Number.isSafeInteger(limitCount) && limitCount > 0 ? Math.min(limitCount, ceiling) : ceiling;
  const bucket = resetAt - windowSeconds;
  if (Math.random() < 0.01) await Promise.resolve().then(() => env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(now - 7200).run()).catch(() => {});
  let reserved: { hit_count: number } | null;
  try {
    reserved = await env.DB.prepare(
    `INSERT INTO rate_limits (bucket_key, window_start, hit_count) VALUES (?, ?, 1)
     ON CONFLICT(bucket_key) DO UPDATE SET hit_count = hit_count + 1
     WHERE hit_count < ? RETURNING hit_count`
  ).bind(`${dimension}:${identifier}:${bucket}`, bucket, safeLimit).first<{ hit_count: number }>();
  } catch { throw new SecurityServiceUnavailable("RATE_LIMITER_UNAVAILABLE"); }
  return { allowed: Boolean(reserved), remaining: reserved ? Math.max(0, safeLimit - reserved.hit_count) : 0, resetAt };
}

export type TurnstileAction = "register" | "paper" | "diploma" | "import";

/** Siteverify plus a durable, atomic consumed-token ledger prevents cross-isolate replay. */
export async function verifyTurnstileToken(env: Env, token: string | null | undefined, clientIp: string, action: TurnstileAction): Promise<boolean> {
  if (typeof token !== "string" || token.length < 8 || token.length > 2048 || token !== token.trim()) return false;
  if (!["register", "paper", "diploma", "import"].includes(action)) return false;
  let verified = false;
  try {
    if (env.ENVIRONMENT === "test" && env.__TEST_TURNSTILE_VERIFY__) {
      verified = await env.__TEST_TURNSTILE_VERIFY__(token, clientIp, action);
    } else {
      const secret = (env.TURNSTILE_SECRET_KEY || "").trim();
      const hosts = (env.TURNSTILE_ALLOWED_HOSTNAMES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!secret || !hosts.length) return false;
      const form = new URLSearchParams({ secret, response: token });
      if (clientIp && clientIp !== "0.0.0.0") form.set("remoteip", clientIp);
      const response = await fetchWithTimeout("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString()
      });
      if (!response.ok) return false;
      const result: unknown = await response.json();
      if (!isJsonObject(result)) return false;
      const challengeAt = typeof result.challenge_ts === "string" ? Date.parse(result.challenge_ts) : NaN;
      const age = Date.now() - challengeAt;
      verified = result.success === true && typeof result.hostname === "string" &&
        hosts.includes(result.hostname.toLowerCase()) && result.action === action &&
        Number.isFinite(challengeAt) && age >= -30000 && age < 300000;
    }
    if (!verified) return false;
    const tokenHash = await sha256Hex(token);
    const consumed = await env.DB.prepare(
      "INSERT INTO turnstile_tokens (token_hash, expires_at) VALUES (?, ?) ON CONFLICT(token_hash) DO NOTHING RETURNING token_hash"
    ).bind(tokenHash, Math.floor(Date.now() / 1000) + 600).first();
    if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM turnstile_tokens WHERE expires_at < ?")
      .bind(Math.floor(Date.now() / 1000)).run().catch(() => {});
    return Boolean(consumed);
  } catch { return false; }
}

export type FeatureFlag = "registration_enabled" | "paper_submission_enabled" | "diploma_registration_enabled" | "public_directory_enabled";
export async function isFeatureEnabled(env: Env, flagKey: FeatureFlag): Promise<boolean> {
  try {
    const row = await env.DB.prepare("SELECT enabled FROM system_flags WHERE flag_key = ?").bind(flagKey).first<{ enabled: number }>();
    return row?.enabled === 1;
  } catch { return false; }
}

/** Production admin needs both its high-entropy secret and an independently verified Access assertion. */
export async function verifyAdminAuthorization(request: Request, env: Env): Promise<boolean> {
  const configured = (env.ADMIN_API_TOKEN || "").trim();
  const provided = (request.headers.get("X-Admin-Token") || "").trim();
  if (configured.length < 24 || !provided || !timingSafeEqualStr(configured, provided)) return false;
  if (env.ENVIRONMENT !== "production" && env.ADMIN_REQUIRE_ACCESS !== "true") return true;
  const issuer = (env.ADMIN_ACCESS_ISSUER || "").trim();
  const audience = (env.ADMIN_ACCESS_AUD || "").trim();
  // No arbitrary JWKS URLs, redirects, userinfo, ports, paths or query strings.
  if (!/^https:\/\/[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/.test(issuer) || !audience) return false;
  try {
    const jwt = parseJwt(request.headers.get("Cf-Access-Jwt-Assertion") || "");
    const p = jwt.payload;
    const now = Math.floor(Date.now() / 1000);
    if (p.iss !== issuer || !Array.isArray(p.aud) || !p.aud.includes(audience) ||
        !isTimestamp(p.exp) || !isTimestamp(p.iat) || p.exp <= now || p.iat > now + 30 || p.exp <= p.iat || p.exp - p.iat > 86400 ||
        (p.nbf !== undefined && (!isTimestamp(p.nbf) || p.nbf > now + 30)) ||
        typeof p.sub !== "string" || !p.sub) return false;
    const key = await getSigningKey(`${issuer}/cdn-cgi/access/certs`, jwt.header.kid);
    return Boolean(key && await verifyJwtSignature(jwt, key));
  } catch { return false; }
}

export function containsForbiddenClientIdentityField(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return ["uid", "firebase_uid", "firebaseUid", "user_id", "userId", "owner_uid", "student_uid"]
    .some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

export async function recordAuditLog(env: Env, eventType: string, actorId: string, ipHash: string, details: Record<string, unknown> = {}): Promise<void> {
  try {
    await env.DB.prepare("INSERT INTO security_audit_log (id, event_type, actor_id, ip_hash, details_json) VALUES (?, ?, ?, ?, ?)")
      .bind(generateId(), eventType, actorId, ipHash, JSON.stringify(details)).run();
  } catch { /* Audit failure must not disclose internals to the caller. */ }
}
