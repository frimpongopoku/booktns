import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// A module-scope client for the ported helper modules (lib/bookings.ts,
// lib/vendors.ts, …) that were written against Next's `db` singleton and
// call Prisma at import-time module scope rather than through DI.
//
// This is the same underlying connection pool config as PrismaService. It
// exists so the port could be mechanical instead of rewriting thirty helper
// modules into injectable providers in one pass; new code should inject
// PrismaService instead. Consolidating the two is tracked in MIGRATION.md.
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
