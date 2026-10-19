import type { JsonWebKeyWithKid } from "../types.ts";

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal, redirect: "error" });
        // Bound the complete response, including a server that sends headers and
        // then stalls its body. These verification endpoints return small JSON.
        if (!response.body) return response;
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > 65536) { await reader.cancel(); throw new Error("VERIFICATION_RESPONSE_TOO_LARGE"); }
          chunks.push(chunk.value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("REMOTE_VERIFICATION_TIMEOUT"));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function decodeSegment(segment: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error("INVALID_JWT_ENCODING");
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - segment.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function parseJwt(token: string) {
  if (typeof token !== "string" || token.length > 16384) throw new Error("INVALID_JWT");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("INVALID_JWT");
  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const header: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decodeSegment(headerSegment)));
  const payload: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decodeSegment(payloadSegment)));
  if (!isJsonObject(header) || !isJsonObject(payload)) throw new Error("INVALID_JWT_OBJECT");
  if (header.alg !== "RS256" || typeof header.kid !== "string" ||
      !header.kid || header.kid.length > 256 || (header.typ !== undefined && header.typ !== "JWT")) {
    throw new Error("INVALID_JWT_HEADER");
  }
  return {
    header: header as Record<string, unknown> & { kid: string }, payload,
    signed: new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
    signature: decodeSegment(signatureSegment)
  };
}

interface JwksCache {
  keys: JsonWebKeyWithKid[];
  expiresAt: number;
  forcedAt: number;
}
// Public verification keys only. Rate limiting and replay state live in D1/edge bindings.
const caches = new Map<string, JwksCache>();
const pending = new Map<string, Promise<JwksCache>>();

async function loadJwks(url: string, force = false): Promise<JwksCache> {
  const now = Date.now();
  const existing = caches.get(url);
  if (!force && existing && existing.expiresAt > now) return existing;
  if (pending.has(url)) return pending.get(url)!;
  const request = (async () => {
    const response = await fetchWithTimeout(url, { headers: { "Cache-Control": force ? "no-cache" : "max-age=0" } });
    if (!response.ok) throw new Error("JWKS_UNAVAILABLE");
    const text = await response.text();
    if (text.length > 65536) throw new Error("JWKS_TOO_LARGE");
    const body: unknown = JSON.parse(text);
    if (!isJsonObject(body) || !Array.isArray(body.keys)) throw new Error("JWKS_INVALID");
    const keys = body.keys.filter((key): key is JsonWebKeyWithKid => isJsonObject(key) &&
      typeof key.kid === "string" && key.kty === "RSA" && typeof key.n === "string" &&
      typeof key.e === "string" && (key.alg === undefined || key.alg === "RS256") &&
      (key.use === undefined || key.use === "sig"));
    if (!keys.length) throw new Error("JWKS_EMPTY");
    const maxAge = Number(response.headers.get("Cache-Control")?.match(/max-age=(\d+)/i)?.[1] || 3600);
    const cached = { keys, expiresAt: now + Math.min(Math.max(maxAge, 0), 21600) * 1000,
      forcedAt: force ? now : existing?.forcedAt || 0 };
    caches.set(url, cached);
    return cached;
  })();
  pending.set(url, request);
  try { return await request; } finally { pending.delete(url); }
}

export async function getSigningKey(url: string, kid: string): Promise<JsonWebKeyWithKid | undefined> {
  let cached = await loadJwks(url);
  let key = cached.keys.find((candidate) => candidate.kid === kid);
  // One bounded refresh for a new kid handles key rotation without allowing an
  // arbitrary-kid flood to fetch Google's/Access's key endpoint on every request.
  if (!key && Date.now() - cached.forcedAt >= 10000) {
    cached.forcedAt = Date.now();
    cached = await loadJwks(url, true);
    key = cached.keys.find((candidate) => candidate.kid === kid);
  }
  return key;
}

export async function verifyJwtSignature(jwt: ReturnType<typeof parseJwt>, key: JsonWebKeyWithKid): Promise<boolean> {
  if (key.kty !== "RSA" || (key.alg !== undefined && key.alg !== "RS256") ||
      (key.use !== undefined && key.use !== "sig")) return false;
  const publicKey = await crypto.subtle.importKey("jwk", key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, jwt.signature, jwt.signed);
}

export function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
