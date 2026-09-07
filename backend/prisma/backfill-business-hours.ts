import "dotenv/config";
import { db } from "../src/common/lib/prisma-client";
import { formatBusinessHours } from "../src/common/lib/business-hours";

// One-time fix for vendors whose Vendor.hours predates VendorService.
// updateHours deriving it from BusinessHours (see business-hours.ts) — those
// two could disagree for as long as a vendor went without touching Settings
// > Opening hours again after the fix shipped. Recomputes hours for every
// vendor from their current BusinessHours rows and only writes when it
// actually changed. Safe to run multiple times.
//
// Usage:
//   DATABASE_URL="<url>" npm run backfill:business-hours

async function main() {
  const vendors = await db.vendor.findMany({
    select: { id: true, name: true, hours: true, businessHours: true },
  });

  let updated = 0;
  for (const vendor of vendors) {
    if (vendor.businessHours.length === 0) continue;
    const derived = formatBusinessHours(vendor.businessHours);
    if (derived === vendor.hours) continue;

    await db.vendor.update({ where: { id: vendor.id }, data: { hours: derived } });
    console.log(`${vendor.name}: "${vendor.hours}" -> "${derived}"`);
    updated++;
  }

  console.log(`\n${updated} of ${vendors.length} vendor(s) updated.`);
  await db.$disconnect();
}

main();
