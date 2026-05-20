const isProd = process.env.NODE_ENV === "production";

// Numeric priority: error=3, warn=2, info=1. LOG_LEVEL=warn silences info logs.
const LEVEL_PRIORITY: Record<string, number> = { error: 3, warn: 2, info: 1 };
const configured = (process.env.LOG_LEVEL || "info").toLowerCase();
const minPriority = LEVEL_PRIORITY[configured] ?? 1;

// Patterns whose values should be masked in production logs.
const SENSITIVE_KEYS = new Set([
  "accessToken", "access_token", "refreshToken", "refresh_token",
  "authorization", "cookie", "password", "secret", "apiKey", "api_key",
  "googleCredentials", "indexNowKey", "private_key",
]);

function maskContext(ctx: Record<string, unknown>): Record<string, unknown> {
  if (!isProd) return ctx;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = SENSITIVE_KEYS.has(k) ? "[REDACTED]" : v;
  }
  return out;
}

function format(level: string, msg: string, ctx?: Record<string, unknown>): string {
  const safe = ctx ? maskContext(ctx) : undefined;
  if (isProd) {
    return JSON.stringify({ level, msg, ...safe, ts: new Date().toISOString() });
  }
  const ctxStr = safe ? ` ${JSON.stringify(safe)}` : "";
  return `[IndexBoost:${level.toUpperCase()}] ${msg}${ctxStr}`;
}

export const logger = {
  info(msg: string, ctx?: Record<string, unknown>) {
    if (LEVEL_PRIORITY["info"] >= minPriority) console.log(format("info", msg, ctx));
  },
  warn(msg: string, ctx?: Record<string, unknown>) {
    if (LEVEL_PRIORITY["warn"] >= minPriority) console.warn(format("warn", msg, ctx));
  },
  error(msg: string, ctx?: Record<string, unknown>) {
    if (LEVEL_PRIORITY["error"] >= minPriority) console.error(format("error", msg, ctx));
  },
};
