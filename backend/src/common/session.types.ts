export type StaffRole = "Owner" | "Management" | "Service";

// Mirrors the payload the Next.js app used to sign, so existing cookies stay
// valid across the cutover and nobody is logged out by the migration.
export interface SessionPayload {
  staffId: string;
  vendorId: string;
  vendorName: string;
  role: StaffRole;
  staffName: string;
  // The Google identity. `email` is the person; staffId/vendorId/role are
  // the membership currently occupied. Absent on cookies minted before
  // multi-shop support, which is why the guard rejects them — see
  // SessionService.verify.
  email: string;
}

export interface SuperAdminPayload {
  sub: string;
  email: string;
  kind: "SUPERADMIN";
}
