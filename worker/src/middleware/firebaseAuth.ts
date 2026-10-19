import type { Env, VerifiedFirebaseUser } from "../types.ts";
import { getSigningKey, isJsonObject, isTimestamp, parseJwt, verifyJwtSignature } from "../utils/jwt.ts";

const FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export class AuthVerificationError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

/** Only a signed Firebase Google ID token establishes a trusted archive owner. */
export async function verifyFirebaseIdToken(token: string, env: Env): Promise<VerifiedFirebaseUser> {
  let jwt: ReturnType<typeof parseJwt>;
  try { jwt = parseJwt(token); } catch {
    throw new AuthVerificationError("AUTH_MALFORMED_TOKEN", "Malformed authentication token.");
  }
  const { payload, header } = jwt;
  const project = (env.FIREBASE_PROJECT_ID || "").trim();
  if (!project) throw new AuthVerificationError("AUTH_SERVER_MISCONFIG", "Authentication is temporarily unavailable.");
  const issuer = `https://securetoken.google.com/${project}`;
  if (payload.aud !== project) throw new AuthVerificationError("AUTH_INVALID_AUD", "Token audience mismatch.");
  if (payload.iss !== issuer) throw new AuthVerificationError("AUTH_INVALID_ISS", "Token issuer mismatch.");
  const uid = payload.sub;
  if (typeof uid !== "string" || uid.length < 1 || uid.length > 128 || /[\s\u0000-\u001f]/.test(uid)) {
    throw new AuthVerificationError("AUTH_INVALID_SUB", "Token subject is invalid.");
  }
  if (payload.user_id !== undefined && payload.user_id !== uid) {
    throw new AuthVerificationError("AUTH_UID_MISMATCH", "Token subject mismatch.");
  }
  const { iat, exp, auth_time: authTime } = payload;
  const now = Math.floor(Date.now() / 1000);
  if (!isTimestamp(iat) || !isTimestamp(exp) || !isTimestamp(authTime)) {
    throw new AuthVerificationError("AUTH_MISSING_TIMESTAMPS", "Token timestamps are invalid.");
  }
  if (exp <= now) throw new AuthVerificationError("AUTH_TOKEN_EXPIRED", "Authentication token has expired.");
  if (iat > now + 30 || authTime > now + 30 || authTime > iat + 30 || exp <= iat || exp - iat > 3900) {
    throw new AuthVerificationError("AUTH_INVALID_TIMESTAMPS", "Token lifetime or authentication time is invalid.");
  }
  if (payload.nbf !== undefined && (!isTimestamp(payload.nbf) || payload.nbf > now + 30)) {
    throw new AuthVerificationError("AUTH_INVALID_TIMESTAMPS", "Token is not yet valid.");
  }
  if (!isJsonObject(payload.firebase) || payload.firebase.sign_in_provider !== "google.com") {
    throw new AuthVerificationError("AUTH_UNSUPPORTED_PROVIDER", "Only Google account authentication is permitted.");
  }
  let signatureValid = false;
  try {
    // Explicitly test-only; production never accepts caller-injected public keys.
    const key = env.ENVIRONMENT === "test" && env.__TEST_JWKS_KEYS__
      ? env.__TEST_JWKS_KEYS__.find((key) => key.kid === header.kid)
      : await getSigningKey(FIREBASE_JWKS_URL, header.kid);
    if (!key) throw new AuthVerificationError("AUTH_UNKNOWN_KID", "Signing key is not recognized.");
    signatureValid = await verifyJwtSignature(jwt, key);
  } catch (err) {
    if (err instanceof AuthVerificationError) throw err;
    throw new AuthVerificationError("AUTH_VERIFIER_UNAVAILABLE", "Authentication verification is temporarily unavailable. Please retry.");
  }
  if (!signatureValid) throw new AuthVerificationError("AUTH_BAD_SIGNATURE", "Token signature verification failed.");
  return {
    uid, iat, exp, authTime, aud: project, iss: issuer, signInProvider: "google.com",
    email: typeof payload.email === "string" ? payload.email : undefined,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined
  };
}

export function extractBearerToken(request: Request): string | null {
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get("Authorization") || "");
  return match && match[1].length <= 16384 ? match[1] : null;
}
