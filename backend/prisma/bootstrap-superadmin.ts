import "dotenv/config";
import { db } from "../src/common/lib/prisma-client";
import { FIRST_SUPERADMIN_EMAIL } from "./first-superadmin";

// Creates the first platform administrator.
//
// This is deliberately NOT part of `prisma db seed`. The seed deletes every
// vendor, booking, and order before writing demo fixtures and must never run
// against production. Bootstrapping the first admin is the opposite: it isn't
// optional demo data, it's the only way anyone ever gets into the superadmin
// console, and it is safe and expected to run in production exactly once,
// right after the first deploy.
//
// Idempotent — re-running it changes nothing. Everyone after the first admin
// is invited from inside the console.
//
// Usage:
//   npm run bootstrap:superadmin                          # the founding admin
//   npm run bootstrap:superadmin -- other@example.com "Name"

async function main() {
  // Defaults to the founding administrator, so the common case is a bare
  // `npm run bootstrap:superadmin` with nothing to remember or mistype.
  const email = (process.argv[2]?.trim() || FIRST_SUPERADMIN_EMAIL).toLowerCase();
  const name = process.argv[3]?.trim();

  if (!email.includes("@")) {
    console.error("Usage: npm run bootstrap:superadmin [-- <email> [name]]");
    process.exit(1);
  }

  const admin = await db.superAdmin.upsert({
    where: { email },
    update: {},
    create: { email, name: name || null },
  });

  const total = await db.superAdmin.count();
  console.log(`Superadmin ready: ${admin.email}${admin.name ? ` (${admin.name})` : ""}`);
  console.log(`${total} superadmin${total === 1 ? "" : "s"} in total.`);
  console.log("Sign in at /superadmin/login with that Google account.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
