import type { Env, JsonWebKeyWithKid, VerifiedFirebaseUser } from "../types.ts";

/**
 * Google SecureToken JWK endpoint for Firebase Authentication ID tokens:
 * https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
 */
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

interface CachedJwks {
  keys: JsonWebKeyWithKid[];
  expiresAt: number;
}

let jwksCache: CachedJwks | null = null;

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function decodeBase64UrlJson<T>(segment: string): T {
  const bytes = base64UrlToUint8Array(segment);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

async function getFirebasePublicKeys(env: Env): Promise<JsonWebKeyWithKid[]> {
  if (env.__TEST_JWKS_KEYS__ && Array.isArray(env.__TEST_JWKS_KEYS__)) {
    return env.__TEST_JWKS_KEYS__;
  }

  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const resp = await fetch(FIREBASE_JWKS_URL, {
    cf: { cacheTtl: 3600, cacheEverything: true }
  } as RequestInit);

  if (!resp.ok) {
    throw new Error("JWKS_FETCH_FAILED");
  }

  const body = (await resp.json()) as { keys?: JsonWebKeyWithKid[] };
  if (!body || !Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("JWKS_INVALID_PAYLOAD");
  }

  let maxAgeSec = 3600;
  const cacheControl = resp.headers.get("Cache-Control") || "";
  const match = cacheControl.match(/max-age=(\d+)/);
  if (match) {
    maxAgeSec = Math.min(Math.max(parseInt(match[1], 10) || 3600, 300), 21600);
  }

  jwksCache = {
    keys: body.keys,
    expiresAt: now + maxAgeSec * 1000
  };
  return body.keys;
}

export class AuthVerificationError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Verifies a Firebase ID Token strictly according to Google/Firebase specification:
 * 1. Header: alg === "RS256", non-empty kid matching Google's public JWK set.
 * 2. Payload claims:
 *    - aud === env.FIREBASE_PROJECT_ID
 *    - iss === `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`
 *    - sub is non-empty string (1..128 chars) -> becomes the sole trusted Firebase UID
 *    - exp > current timestamp (with max 30s clock-skew tolerance)
 *    - iat <= current timestamp (with max 30s clock-skew tolerance) and auth_time <= now
 *    - firebase.sign_in_provider === "google.com" (Strictly Google Sign-In only)
 * 3. Cryptographic RSASSA-PKCS1-v1_5 SHA-256 signature verification via Web Crypto API.
 */
export async function verifyFirebaseIdToken(
  token: string,
  env: Env
): Promise<VerifiedFirebaseUser> {
  if (!token || typeof token !== "string") {
    throw new AuthVerificationError("AUTH_MISSING_TOKEN", "Missing authentication token.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthVerificationError("AUTH_MALFORMED_TOKEN", "Malformed JWT structure.");
  }

  const [headerSeg, payloadSeg, signatureSeg] = parts;

  let header: { alg?: string; kid?: string; typ?: string };
  let payload: Record<string, unknown>;
  try {
    header = decodeBase64UrlJson(headerSeg);
    payload = decodeBase64UrlJson(payloadSeg);
  } catch {
    throw new AuthVerificationError("AUTH_MALFORMED_JSON", "Invalid JWT encoding.");
  }

  if (header.alg !== "RS256" || !header.kid || typeof header.kid !== "string") {
    throw new AuthVerificationError(
      "AUTH_INVALID_HEADER",
      "Token must use RS256 algorithm and specify a key ID."
    );
  }

  const expectedProjectId = (env.FIREBASE_PROJECT_ID || "").trim();
  if (!expectedProjectId) {
    throw new AuthVerificationError("AUTH_SERVER_MISCONFIG", "Auth verifier is not configured.");
  }

  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  const nowSec = Math.floor(Date.now() / 1000);
  const clockSkewSec = 30;

  if (payload.aud !== expectedProjectId) {
    throw new AuthVerificationError("AUTH_INVALID_AUD", "Token audience mismatch.");
  }

  if (payload.iss !== expectedIssuer) {
    throw new AuthVerificationError("AUTH_INVALID_ISS", "Token issuer mismatch.");
  }

  const sub = payload.sub;
  if (typeof sub !== "string" || sub.trim().length < 6 || sub.length > 128) {
    throw new AuthVerificationError("AUTH_INVALID_SUB", "Token subject (UID) is invalid.");
  }

  if (payload.user_id && payload.user_id !== sub) {
    throw new AuthVerificationError("AUTH_UID_MISMATCH", "Token user_id does not match sub.");
  }

  const exp = payload.exp;
  const iat = payload.iat;
  if (typeof exp !== "number" || typeof iat !== "number") {
    throw new AuthVerificationError("AUTH_MISSING_TIMESTAMPS", "Token timestamps are missing.");
  }

  if (exp <= nowSec - clockSkewSec) {
    throw new AuthVerificationError("AUTH_TOKEN_EXPIRED", "Authentication token has expired.");
  }

  if (iat > nowSec + clockSkewSec) {
    throw new AuthVerificationError("AUTH_INVALID_IAT", "Token issued in the future.");
  }

  if (exp - iat > 86400) {
    throw new AuthVerificationError("AUTH_INVALID_LIFETIME", "Token lifetime exceeds limits.");
  }

  // Enforce Phase 1 requirement: Only Google Sign-In is permitted
  const firebaseClaim = payload.firebase as { sign_in_provider?: string } | undefined;
  const provider = firebaseClaim?.sign_in_provider || "";
  if (provider !== "google.com") {
    throw new AuthVerificationError(
      "AUTH_UNSUPPORTED_PROVIDER",
      "Only Google account authentication (google.com) is permitted."
    );
  }

  const keys = await getFirebasePublicKeys(env);
  const matchingJwk = keys.find((k) => k.kid === header.kid);
  if (!matchingJwk) {
    throw new AuthVerificationError("AUTH_UNKNOWN_KID", "Signing key ID not recognized.");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    matchingJwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  const signedContent = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`);
  const signatureBytes = base64UrlToUint8Array(signatureSeg);

  const isValidSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signatureBytes,
    signedContent
  );

  if (!isValidSignature) {
    throw new AuthVerificationError("AUTH_BAD_SIGNATURE", "Token signature verification failed.");
  }

  return {
    uid: sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    emailVerified: Boolean(payload.email_verified),
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    signInProvider: provider,
    iat,
    exp,
    aud: expectedProjectId,
    iss: expectedIssuer
  };
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 20 ? token : null;
}
