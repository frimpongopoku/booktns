// No Sentry SDK here — unlike the Next.js frontend's lib/logger.ts (which
// this mirrors the shape of), the API has no Sentry integration wired up
// yet. Structured JSON logging only; add Sentry reporting here if/when the
// backend gets its own DSN and `@sentry/node` init.
type Level = "info" | "warn" | "error";

function log(level: Level, message: string, context?: Record<string, unknown>) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  console[level === "info" ? "log" : level](JSON.stringify(entry));
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
