// Every environment variable the API reads, resolved in one place so a
// missing one fails at boot with a clear message rather than at the first
// request that happens to need it.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  },

  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),

  // The browser origin(s) allowed to call this API with credentials.
  // Comma-separated so preview deployments can be added without a code
  // change. There is no wildcard fallback on purpose: CORS with
  // credentials + "*" is rejected by browsers anyway, and silently
  // allowing every origin would defeat the point of the cookie being
  // httpOnly in the first place.
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // Cookie scoping. The frontend and this API are on different hosts, so
  // how the session cookie is scoped is the single most consequential
  // deployment decision:
  //
  //   Same apex (app.booktns.com + api.booktns.com):
  //     COOKIE_DOMAIN=.booktns.com, COOKIE_SAMESITE=lax  <- strongly preferred
  //
  //   Unrelated hosts (booktns.vercel.app + booktns-api.up.railway.app):
  //     COOKIE_DOMAIN unset, COOKIE_SAMESITE=none
  //     SameSite=None is a third-party cookie. Safari's ITP and Chrome's
  //     third-party cookie phase-out block or expire these, so sessions
  //     will drop for real users. Treat it as a staging-only configuration.
  cookieDomain: optional("COOKIE_DOMAIN"),
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "none" | "strict",

  firebase: {
    projectId: optional("FIREBASE_ADMIN_PROJECT_ID"),
    clientEmail: optional("FIREBASE_ADMIN_CLIENT_EMAIL"),
    privateKey: optional("FIREBASE_ADMIN_PRIVATE_KEY"),
  },

  appUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
