import { db } from "@/lib/db";

// Verification attaches to the *person*, not the shop.
//
// One owner can run several vendors. They shouldn't have to photograph their
// Ghana Card once per shop, and a customer shouldn't see a Verified badge on
// one of their storefronts but not another. So approving an application marks
// the owning Staff member verified and cascades onto every vendor that person
// owns — in one transaction, so the denormalised Vendor.verificationStatus can
// never disagree with the Staff.verified it is derived from.

export interface CascadeResult {
  staffId: string;
  vendorNames: string[];
}

// Resolves the owner of a vendor. Verification is owner-only throughout: it's
// personal identity data, and a Management or Service staff member has no
// business submitting or being verified on the owner's behalf.
export async function findVendorOwner(vendorId: string) {
  return db.staff.findFirst({
    where: { vendorId, role: "Owner", active: true },
    select: { id: true, name: true, email: true },
  });
}

export async function verifyPerson(staffId: string): Promise<CascadeResult> {
  const owner = await db.staff.findUnique({ where: { id: staffId }, select: { email: true } });
  if (!owner) throw new Error(`Staff ${staffId} not found`);

  // Every vendor this *person* owns, matched on their email rather than on
  // Staff.id — a person running several shops has a separate Staff row in
  // each one, and the email is what identifies them across all of them (it's
  // also what Google sign-in matches on).
  const ownedStaff = await db.staff.findMany({
    where: { email: { equals: owner.email, mode: "insensitive" }, role: "Owner", active: true },
    select: { id: true, vendorId: true, vendor: { select: { name: true } } },
  });

  const now = new Date();
  await db.$transaction([
    ...ownedStaff.map((s) =>
      db.staff.update({ where: { id: s.id }, data: { verified: true, verifiedAt: now } })
    ),
    ...ownedStaff.map((s) =>
      db.vendor.update({
        where: { id: s.vendorId },
        data: { verificationStatus: "VERIFIED", verifiedAt: now },
      })
    ),
  ]);

  return { staffId, vendorNames: ownedStaff.map((s) => s.vendor.name) };
}

// The exact mirror of verifyPerson — back to NONE, timestamps nulled.
export async function unverifyPerson(staffId: string): Promise<CascadeResult> {
  const owner = await db.staff.findUnique({ where: { id: staffId }, select: { email: true } });
  if (!owner) throw new Error(`Staff ${staffId} not found`);

  const ownedStaff = await db.staff.findMany({
    where: { email: { equals: owner.email, mode: "insensitive" }, role: "Owner", active: true },
    select: { id: true, vendorId: true, vendor: { select: { name: true } } },
  });

  await db.$transaction([
    ...ownedStaff.map((s) =>
      db.staff.update({ where: { id: s.id }, data: { verified: false, verifiedAt: null } })
    ),
    ...ownedStaff.map((s) =>
      db.vendor.update({
        where: { id: s.vendorId },
        data: { verificationStatus: "NONE", verifiedAt: null },
      })
    ),
  ]);

  return { staffId, vendorNames: ownedStaff.map((s) => s.vendor.name) };
}

// Ghana Card format, e.g. GHA-123456789-0. The error message names the shape
// so a vendor can fix it without guessing.
const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/;

export function normalizeGhanaCardNumber(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidGhanaCardNumber(normalized: string): boolean {
  return GHANA_CARD_PATTERN.test(normalized);
}
