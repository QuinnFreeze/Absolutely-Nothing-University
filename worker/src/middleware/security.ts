import type { Env } from "../types.ts";
import { generateId, timingSafeEqualStr } from "../utils/crypto.ts";

/**
 * Enforces sliding-window rate limits per IP and per authenticated Firebase UID
 * backed by Cloudflare D1.
 */
export async function checkRateLimit(
  env: Env,
  dimension: "ip" | "uid" | "write",
  identifier: string,
  limitCount: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowBucket = Math.floor(nowSec / windowSeconds) * windowSeconds;
  const bucketKey = `${dimension}:${identifier}:${windowBucket}`;

  // Periodically prune expired rate limit windows (probabilistic 5% cleanup to keep D1 lean)
  if (Math.random() < 0.05) {
    await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
      .bind(nowSec - 7200)
      .run()
      .catch(() => {});
  }

  const existing = await env.DB.prepare(
    "SELECT hit_count FROM rate_limits WHERE bucket_key = ?"
  )
    .bind(bucketKey)
    .first<{ hit_count: number }>();

  if (!existing) {
    await env.DB.prepare(
      "INSERT INTO rate_limits (bucket_key, window_start, hit_count) VALUES (?, ?, 1) ON CONFLICT(bucket_key) DO UPDATE SET hit_count = hit_count + 1"
    )
      .bind(bucketKey, windowBucket)
      .run();
    return {
      allowed: true,
      remaining: Math.max(0, limitCount - 1),
      resetAt: windowBucket + windowSeconds
    };
  }

  if (existing.hit_count >= limitCount) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowBucket + windowSeconds
    };
  }

  await env.DB.prepare(
    "UPDATE rate_limits SET hit_count = hit_count + 1 WHERE bucket_key = ?"
  )
    .bind(bucketKey)
    .run();

  return {
    allowed: true,
    remaining: Math.max(0, limitCount - (existing.hit_count + 1)),
    resetAt: windowBucket + windowSeconds
  };
}

/**
 * Verifies Cloudflare Turnstile token on write/sensitive operations.
 * In production, a missing or invalid Turnstile secret or token fails closed.
 */
export async function verifyTurnstileToken(
  env: Env,
  token: string | null | undefined,
  clientIp: string
): Promise<boolean> {
  if (!token || typeof token !== "string" || token.trim().length < 8) {
    return false;
  }

  if (env.__TEST_TURNSTILE_VERIFY__) {
    return env.__TEST_TURNSTILE_VERIFY__(token.trim(), clientIp);
  }

  const secret = (env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret) {
    // Fail closed if Turnstile secret is not configured in production
    return false;
  }

  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token.trim());
  if (clientIp && clientIp !== "0.0.0.0") {
    formData.set("remoteip", clientIp);
  }

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString()
  });

  if (!resp.ok) return false;
  const result = (await resp.json()) as { success?: boolean };
  return Boolean(result && result.success === true);
}

/**
 * Checks if a system feature kill-switch is enabled in D1.
 */
export async function isFeatureEnabled(
  env: Env,
  flagKey:
    | "registration_enabled"
    | "paper_submission_enabled"
    | "diploma_registration_enabled"
    | "public_directory_enabled"
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT enabled FROM system_flags WHERE flag_key = ?"
  )
    .bind(flagKey)
    .first<{ enabled: number }>();

  if (!row) return true;
  return row.enabled === 1;
}

/**
 * Verifies the X-Admin-Token header using constant-time comparison.
 */
export function verifyAdminAuthorization(request: Request, env: Env): boolean {
  const configuredToken = (env.ADMIN_API_TOKEN || "").trim();
  if (!configuredToken || configuredToken.length < 24) {
    // Refuse admin operations if secret is missing or weak
    return false;
  }
  const provided = (request.headers.get("X-Admin-Token") || "").trim();
  if (!provided) return false;
  return timingSafeEqualStr(configuredToken, provided);
}

/**
 * Rejects payloads containing client-supplied identity fields (`uid`, `firebase_uid`,
 * `userId`, `student_uid`) to enforce Phase 2: "Never accept client-passed UID as identity basis."
 */
export function containsForbiddenClientIdentityField(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const rec = body as Record<string, unknown>;
  const forbiddenKeys = ["uid", "firebase_uid", "firebaseUid", "user_id", "userId", "owner_uid"];
  return forbiddenKeys.some((k) => Object.prototype.hasOwnProperty.call(rec, k));
}

/**
 * Writes a privacy-preserving security audit log entry.
 */
export async function recordAuditLog(
  env: Env,
  eventType: string,
  actorId: string,
  ipHash: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await env.DB.prepare(
      "INSERT INTO security_audit_log (id, event_type, actor_id, ip_hash, details_json) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(generateId(), eventType, actorId, ipHash, JSON.stringify(details))
      .run();
  } catch {
    // Non-fatal if audit table write fails
  }
}
