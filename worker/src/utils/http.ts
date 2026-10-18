import type { Env } from "../types.ts";

export function getAllowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const whitelist = (env.ALLOWED_ORIGINS || "https://freeze.edu.kg")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return whitelist.includes(origin) ? origin : null;
}

export function buildSecurityHeaders(allowedOrigin: string | null, requestId: string): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, X-Turnstile-Token, X-Idempotency-Key, X-Admin-Token"
    );
    headers.set("Access-Control-Max-Age", "86400");
    headers.set("Vary", "Origin");
  }

  return headers;
}

export function jsonResponse(
  data: unknown,
  status: number,
  allowedOrigin: string | null,
  requestId: string,
  extraHeaders?: Record<string, string>
): Response {
  const headers = buildSecurityHeaders(allowedOrigin, requestId);
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Safe error response that NEVER leaks stack traces, SQL queries, internal paths,
 * or secret values.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  allowedOrigin: string | null,
  requestId: string
): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message,
        requestId
      }
    },
    status,
    allowedOrigin,
    requestId
  );
}
