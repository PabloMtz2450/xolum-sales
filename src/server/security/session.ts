import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "__Host-xolum_session";
export const CSRF_COOKIE = "__Host-xolum_csrf";

export const hashSecret = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export function createOpaqueSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSecret(token) };
}

export function createCsrfToken() {
  return randomBytes(32).toString("base64url");
}

export function verifyCsrf(cookieToken: string | undefined, headerToken: string | undefined) {
  if (!cookieToken || !headerToken) return false;
  const left = Buffer.from(hashSecret(cookieToken), "hex");
  const right = Buffer.from(hashSecret(headerToken), "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export const sessionCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

export const csrfCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: false,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});
