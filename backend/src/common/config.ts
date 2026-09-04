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
  port: Number(process.env.PORT ?? 2666),
  nodeEnv: process.env.NODE_ENV ?? "development",
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  },

  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),

  // A SEPARATE secret for the platform console's token space. Different
  // secrets mean a vendor token fails signature verification as a superadmin
  // token and vice versa — a stronger guarantee than both guards remembering
  // to check a `kind` field. Falls back to jwtSecret so an existing single-
  // secret deployment keeps working, but set it in production.
  superAdminJwtSecret: process.env.SUPERADMIN_JWT_SECRET?.trim() || required("JWT_SECRET"),

  firebase: {
    projectId: optional("FIREBASE_ADMIN_PROJECT_ID"),
    clientEmail: optional("FIREBASE_ADMIN_CLIENT_EMAIL"),
    privateKey: optional("FIREBASE_ADMIN_PRIVATE_KEY"),
  },

  appUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:2665",
} as const;
