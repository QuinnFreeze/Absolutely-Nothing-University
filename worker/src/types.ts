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
  ADMIN_API_TOKEN?: string;
  IP_HASH_SALT?: string;
  RATE_LIMIT_IP_PER_MIN?: string;
  RATE_LIMIT_UID_PER_MIN?: string;
  RATE_LIMIT_WRITE_PER_HOUR?: string;
  /** Optional custom JWKS fetcher for unit/security testing */
  __TEST_JWKS_KEYS__?: JsonWebKeyWithKid[];
  /** Optional custom Turnstile verifier for unit/security testing */
  __TEST_TURNSTILE_VERIFY__?: (token: string, ip: string) => Promise<boolean>;
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
  exp: number;
  aud: string;
  iss: string;
}

export interface StudentRecord {
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
