import "dotenv/config";
import { db } from "../src/common/lib/prisma-client";

// One-off, safely-re-runnable fix: renames the demo vendor's "Rose"
// identity to "Akosua" wherever it appears, on whichever row it's actually
// on in THIS database — not just the exact strings lib/data.ts currently
// seeds with.
//
// Why pattern matching instead of an exact-string map: a first version of
// this script hardcoded the exact old strings from lib/data.ts and missed
// real drift already sitting in this environment's database — two staff
// rows on old @glambyrose.com addresses that predate the Ghanaian
// localization pass and were never part of lib/data.ts's Nigerian-era
// content, and a payment method accountName ("Rose Adeyemi") that doesn't
// match lib/data.ts's "Rose Mensah" either. A real production database
// seeded over many sessions is not guaranteed to match the current source
// file exactly, so this replaces substrings on whatever it finds instead
// of requiring an exact match.
//
// Why re-runnable rather than one-shot: the vendor itself is matched by
// EITHER its old or new slug, and every sub-update is scoped to rows that
// still contain the old pattern — so running this again after a partial
// fix (or after lib/data.ts drifts further) only touches what's still
// stale, and running it with nothing left to fix is a clean no-op.
//
// Usage:
//   npm run rename-demo-vendor
//   DATABASE_URL="<railway public url>" npm run rename-demo-vendor   (prod)

const OLD_SLUG = "glambyrose";
const NEW_SLUG = "glambyakosua";
const NEW_NAME = "Glam by Akosua";
const OLD_EMAIL_DOMAIN = "@glambyrose.com";
const NEW_EMAIL_DOMAIN = "@glambyakosua.com";

async function main() {
  const vendor = await db.vendor.findFirst({ where: { slug: { in: [OLD_SLUG, NEW_SLUG] } } });
  if (!vendor) {
    console.log(`No vendor found at "${OLD_SLUG}" or "${NEW_SLUG}". Nothing to do.`);
    return;
  }

  const changes: string[] = [];

  await db.$transaction(async (tx) => {
    if (vendor.name !== NEW_NAME || vendor.slug !== NEW_SLUG) {
      await tx.vendor.update({ where: { id: vendor.id }, data: { name: NEW_NAME, slug: NEW_SLUG } });
      changes.push(`vendor: "${vendor.name}" (${vendor.slug}) -> "${NEW_NAME}" (${NEW_SLUG})`);
    }

    // Domain only — the local part (whoever's mailbox it actually is) isn't
    // part of the shop's identity and is left alone.
    const staleStaff = await tx.staff.findMany({
      where: { vendorId: vendor.id, email: { endsWith: OLD_EMAIL_DOMAIN } },
    });
    for (const s of staleStaff) {
      const newEmail = s.email.slice(0, -OLD_EMAIL_DOMAIN.length) + NEW_EMAIL_DOMAIN;
      await tx.staff.update({ where: { id: s.id }, data: { email: newEmail } });
      changes.push(`staff email: ${s.email} -> ${newEmail}`);
    }

    // Every "Rose" is this same demo owner persona under this one vendor —
    // scoping to vendorId makes a plain substring match safe here.
    const staffNamedRose = await tx.staff.findMany({
      where: { vendorId: vendor.id, name: { contains: "Rose", mode: "insensitive" } },
    });
    for (const s of staffNamedRose) {
      const newName = s.name.replace(/Rose/gi, "Akosua");
      await tx.staff.update({ where: { id: s.id }, data: { name: newName } });
      changes.push(`staff name: "${s.name}" -> "${newName}"`);
    }

    const staleMethods = await tx.paymentMethod.findMany({
      where: { vendorId: vendor.id, accountName: { contains: "Rose", mode: "insensitive" } },
    });
    for (const pm of staleMethods) {
      const newAccountName = pm.accountName.replace(/Rose/gi, "Akosua");
      await tx.paymentMethod.update({ where: { id: pm.id }, data: { accountName: newAccountName } });
      changes.push(`payment accountName: "${pm.accountName}" -> "${newAccountName}"`);
    }

    const staleVideos = await tx.vendorVideo.findMany({
      where: { vendorId: vendor.id, title: { contains: "Rose", mode: "insensitive" } },
    });
    for (const v of staleVideos) {
      const newTitle = v.title.replace(/Rose/gi, "Akosua");
      await tx.vendorVideo.update({ where: { id: v.id }, data: { title: newTitle } });
      changes.push(`video title: "${v.title}" -> "${newTitle}"`);
    }
  });

  if (changes.length === 0) {
    console.log(`Vendor "${vendor.slug}" (id ${vendor.id}) — already fully renamed, nothing to do.`);
    return;
  }
  console.log(`Vendor "${vendor.slug}" (id ${vendor.id}) — applied ${changes.length} change(s):`);
  for (const c of changes) console.log(`  - ${c}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
