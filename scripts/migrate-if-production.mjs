// Applies pending Prisma migrations, but ONLY for a Vercel production build.
//
// Preview deployments are the reason this guard exists. Vercel builds every
// branch and pull request, and preview builds typically inherit the same
// DATABASE_URL as production — so putting `prisma migrate deploy` directly in
// the build command would let an unreviewed branch migrate the production
// database the moment someone opens a PR. That is not a hypothetical: it is
// the default behaviour of shared environment variables.
//
// Local builds (`npm run build` on a laptop) are skipped too. Migrations
// there belong to `npx prisma migrate dev`, which is interactive and creates
// the migration file; running `deploy` behind the developer's back would
// apply half-finished work without them asking.
import { execSync } from "node:child_process";

const { VERCEL, VERCEL_ENV, DATABASE_URL } = process.env;

if (!VERCEL) {
  console.log("[migrate] not a Vercel build — skipping (use `prisma migrate dev` locally)");
  process.exit(0);
}

if (VERCEL_ENV !== "production") {
  console.log(`[migrate] VERCEL_ENV is "${VERCEL_ENV}" — skipping, only production builds migrate`);
  process.exit(0);
}

if (!DATABASE_URL) {
  // Fail loudly. A production build with no database is going to 500 on
  // every request anyway; better to stop here with a clear reason.
  console.error("[migrate] DATABASE_URL is not set on a production build — refusing to continue");
  process.exit(1);
}

console.log("[migrate] production build — applying pending migrations");
execSync("prisma migrate deploy", { stdio: "inherit" });
