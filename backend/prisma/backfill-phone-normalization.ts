import "dotenv/config";
import { db } from "../src/common/lib/prisma-client";
import { normalizePhone } from "../src/common/lib/phone";

// One-time fix for vendors whose phone/personalWhatsappNumber/ownerPhone
// predate VendorService.update() normalizing them — those three fields used
// to be saved as whatever the vendor typed ("024 412 3456", no country
// code), which is exactly what produces a broken wa.me/<number> link:
// WhatsApp can't resolve a malformed number to a contact. Re-normalizes
// every vendor's stored value and only writes the ones that actually
// change. Safe to run multiple times — normalizePhone() is idempotent on
// an already-correct E.164 number.
//
// Usage:
//   DATABASE_URL="<url>" npm run backfill:phone-normalization

async function main() {
  const vendors = await db.vendor.findMany({
    select: { id: true, name: true, phone: true, personalWhatsappNumber: true, ownerPhone: true, whatsapp: true },
  });

  let updated = 0;
  for (const vendor of vendors) {
    const data: Record<string, string | null> = {};

    // `phone` is required/non-nullable — an unparseable value has to stay
    // as-is rather than being nulled out (that would break a NOT NULL
    // column); it's logged instead, for someone to fix by hand.
    if (vendor.phone) {
      const normalized = normalizePhone(vendor.phone);
      if (normalized && normalized !== vendor.phone) data.phone = normalized;
      else if (!normalized) console.warn(`${vendor.name}: phone "${vendor.phone}" doesn't look like a real number — left as-is`);
    }

    if (vendor.whatsapp) {
      const normalized = normalizePhone(vendor.whatsapp);
      if (normalized && normalized !== vendor.whatsapp) data.whatsapp = normalized;
      else if (!normalized) console.warn(`${vendor.name}: whatsapp "${vendor.whatsapp}" doesn't look like a real number — left as-is`);
    }

    if (vendor.personalWhatsappNumber) {
      const normalized = normalizePhone(vendor.personalWhatsappNumber);
      // Nullable field — an unparseable value is cleared rather than left
      // broken, since the fallback (vendor.whatsapp) is a valid substitute.
      if (normalized !== vendor.personalWhatsappNumber) data.personalWhatsappNumber = normalized;
      if (!normalized) console.warn(`${vendor.name}: personalWhatsappNumber "${vendor.personalWhatsappNumber}" doesn't look like a real number — cleared`);
    }

    if (vendor.ownerPhone) {
      const normalized = normalizePhone(vendor.ownerPhone);
      if (normalized !== vendor.ownerPhone) data.ownerPhone = normalized;
      if (!normalized) console.warn(`${vendor.name}: ownerPhone "${vendor.ownerPhone}" doesn't look like a real number — cleared`);
    }

    if (Object.keys(data).length === 0) continue;

    await db.vendor.update({ where: { id: vendor.id }, data });
    console.log(`${vendor.name}:`, data);
    updated++;
  }

  console.log(`\n${updated} of ${vendors.length} vendor(s) updated.`);
  await db.$disconnect();
}

main();
