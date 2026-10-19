export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: { changes?: number; last_row_id?: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_ALLOWED_HOSTNAMES?: string;
  ADMIN_API_TOKEN?: string;
  ADMIN_REQUIRE_ACCESS?: string;
  ADMIN_ACCESS_ISSUER?: string;
  ADMIN_ACCESS_AUD?: string;
  IP_RATE_LIMITER?: EdgeRateLimiter;
  UID_RATE_LIMITER?: EdgeRateLimiter;
  WRITE_RATE_LIMITER?: EdgeRateLimiter;
  IP_HASH_SALT?: string;
  RATE_LIMIT_IP_PER_MIN?: string;
  RATE_LIMIT_UID_PER_MIN?: string;
  RATE_LIMIT_WRITE_PER_HOUR?: string;
  /** Optional custom JWKS fetcher for unit/security testing */
  __TEST_JWKS_KEYS__?: JsonWebKeyWithKid[];
  /** Optional custom Turnstile verifier for unit/security testing */
  __TEST_TURNSTILE_VERIFY__?: (token: string, ip: string, action: "register" | "paper" | "diploma" | "import") => Promise<boolean>;
}

export interface JsonWebKeyWithKid extends JsonWebKey {
  kid: string;
  alg?: string;
  use?: string;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  signInProvider: string;
  iat: number;
  authTime: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface EdgeRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface StudentRecord {
  revision: number;
  firebase_uid: string;
  student_number: string;
  nickname: string;
  avatar_seed: string;
  avatar_url: string;
  college: "retreat" | "procrastination" | "perfunctory" | "daydream";
  major: string;
  enrollment_year: number;
  enrollment_date: string;
  fictional_honor: string;
  visibility: "private" | "public";
  public_consent: number;
  public_consent_at: string | null;
  terms_accepted_at: string;
  privacy_accepted_at: string;
  idle_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface RequestContext {
  env: Env;
  request: Request;
  ipHash: string;
  clientIp: string;
  origin: string | null;
  requestId: string;
  user?: VerifiedFirebaseUser;
}
