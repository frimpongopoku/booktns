import * as Sentry from "@sentry/nextjs";

type Level = "info" | "warn" | "error";

function log(level: Level, message: string, context?: Record<string, unknown>) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  console[level === "info" ? "log" : level](JSON.stringify(entry));
  if (level === "error" && context?.err instanceof Error) {
    Sentry.captureException(context.err, { extra: context });
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
