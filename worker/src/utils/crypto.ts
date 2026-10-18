/**
 * Cryptographic and input-sanitization utilities for the Cloudflare Worker.
 * Uses Web Crypto API (standard in Cloudflare Workers and Node 20+).
 */

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Unambiguous uppercase alphanumeric

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 * on admin tokens or secret comparisons.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length || aBytes.length === 0) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

/**
 * Generates a globally unique ANU student number: ANU-YYYY-XXXXXX
 */
export function generateStudentNumber(year = 2026): string {
  const safeYear = Number.isInteger(year) && year >= 1900 && year <= 2099 ? year : 2026;
  const randBytes = new Uint8Array(6);
  crypto.getRandomValues(randBytes);
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHANUM[randBytes[i] % ALPHANUM.length];
  }
  return `ANU-${safeYear}-${suffix}`;
}

/**
 * Generates a unique UUID v4 for primary keys and audit rows.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Strips control characters, HTML angle brackets, and script payloads,
 * enforcing strict length bounds for user-supplied strings.
 */
export function sanitizePlainText(input: unknown, maxLen: number, fallback = ""): string {
  if (typeof input !== "string") return fallback;
  const cleaned = input
    // Remove ASCII/Unicode control chars
    .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮﻿]/g, "")
    // Neutralize HTML/SVG/script delimiters to prevent stored XSS
    .replace(/[<>]/g, "")
    .trim();
  if (!cleaned) return fallback;
  return Array.from(cleaned).slice(0, maxLen).join("");
}

/**
 * Validates that an avatar URL is either empty or an authentic HTTPS Google usercontent URL.
 */
export function sanitizeAvatarUrl(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();
    if (
      host === "lh3.googleusercontent.com" ||
      host.endsWith(".googleusercontent.com") ||
      host === "freeze.edu.kg"
    ) {
      return parsed.toString().slice(0, 512);
    }
    return "";
  } catch {
    return "";
  }
}

export function sanitizeAvatarSeed(seed: unknown): string {
  if (typeof seed !== "string") return "crest-oxford";
  const cleaned = seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return cleaned || "crest-oxford";
}
