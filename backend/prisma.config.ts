import { defineConfig } from "prisma/config";

// The schema's datasource block deliberately has no `url` — the running app
// never uses it, connecting instead through the @prisma/adapter-pg driver
// adapter constructed in code (src/common/lib/prisma-client.ts,
// src/common/prisma/prisma.service.ts). CLI commands (migrate deploy, db
// push, studio) have no such adapter to fall back on, so Prisma 7 requires
// this file to tell them where to find the database.
//
// Deliberately `process.env.DATABASE_URL` (may be undefined), not the `env()`
// helper — `env()` throws as soon as this file is loaded if the variable is
// missing, and this file is loaded by every prisma CLI invocation, including
// `prisma generate` during `npm run build`/`postinstall`. The Docker build
// (this repo's Dockerfile runs `npm ci` and `npm run build` in the image
// build stage) has no DATABASE_URL at all — only the running container does
// — and `generate` never actually connects to a database, so it doesn't need
// one. Only `migrate deploy`/`db push`/`studio` need a real value, and those
// are always invoked with `DATABASE_URL=... npm run db:deploy` per
// MIGRATION.md, which is what actually supplies it at the point it matters.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
