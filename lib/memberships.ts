import { db } from "@/lib/db";
import type { StaffRole } from "@/types";

// One person, one Google account, potentially several shops. Each row here
// is a Staff record at a different vendor, carrying the role that person
// holds *there* — a stylist at one salon can be the owner of another, and
// switching spaces must switch role with it.
export interface StaffMembership {
  staffId: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorLogoUrl: string | null;
  role: StaffRole;
  staffName: string;
}

// Every active membership for a verified Google email, oldest first so the
// list order is stable across sign-ins (a switcher that reshuffles itself
// is worse than useless).
//
// Case-insensitive to match the allowlist rule in CLAUDE.md § Auth Rules:
// Google addresses are case-preserving but case-insensitive, and a vendor
// typing "Ama@shop.com" must not lock out "ama@shop.com".
export async function getMembershipsForEmail(email: string | undefined | null): Promise<StaffMembership[]> {
  // Prisma DROPS `equals: undefined` from a where clause rather than
  // matching nothing, so an absent email would silently widen this query to
  // "every active staff row at every active vendor" — which is exactly what
  // it did for sessions minted before SessionPayload gained `email`. Since
  // findMembership() below is the authorization check for switching shops,
  // that turned a stale cookie into access to any vendor. Fail closed.
  if (!email || !email.trim()) return [];

  const staffRows = await db.staff.findMany({
    where: {
      email: { equals: email, mode: "insensitive" },
      active: true,
      // A suspended vendor's dashboard still opens (staff need to read the
      // suspension notice and contact support), but a soft-deleted vendor
      // account is gone as far as sign-in is concerned.
      vendor: { active: true },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      vendorId: true,
      role: true,
      name: true,
      vendor: { select: { name: true, slug: true, logoUrl: true } },
    },
  });

  return staffRows.map((staff) => ({
    staffId: staff.id,
    vendorId: staff.vendorId,
    vendorName: staff.vendor.name,
    vendorSlug: staff.vendor.slug,
    vendorLogoUrl: staff.vendor.logoUrl,
    role: staff.role as StaffRole,
    staffName: staff.name,
  }));
}

// Resolves one specific membership, re-checking it from the database rather
// than trusting anything the client sent. This is the authorization check
// for switching spaces: a request naming a vendor the signed-in email has
// no active Staff row at returns null, and the caller refuses.
export async function findMembership(email: string, vendorId: string): Promise<StaffMembership | null> {
  const memberships = await getMembershipsForEmail(email);
  return memberships.find((m) => m.vendorId === vendorId) ?? null;
}
