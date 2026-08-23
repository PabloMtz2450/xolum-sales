import "server-only";
import { createHash } from "node:crypto";

type Level = "INFO" | "WARN" | "ERROR";
const SENSITIVE = /password|secret|token|authorization|cookie|certificate|private.?key|xml/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SENSITIVE.test(key) ? "[REDACTED]" : sanitize(entry)]));
  return value;
}

export function log(level: Level, event: string, context: Record<string, unknown> = {}) {
  if (!/^[A-Z0-9_.-]{3,80}$/.test(event)) throw new Error("LOG_EVENT_INVALID");
  const record = { timestamp: new Date().toISOString(), level, event, ...sanitize(context) as Record<string, unknown> };
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

export const logIdentifier = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);
