// The platform's founding administrator.
//
// Shared by prisma/bootstrap-superadmin.ts (the production path) and
// prisma/seed.ts (dev convenience) so the two can never drift to different
// addresses — a mismatch would mean a freshly seeded dev database grants
// console access to an account that can't get in on production, or worse.
//
// This must be the exact Google account used to sign in at /superadmin/login.
// Everyone after this one is invited from inside the console.
export const FIRST_SUPERADMIN_EMAIL = "mrfimpong@gmail.com";
