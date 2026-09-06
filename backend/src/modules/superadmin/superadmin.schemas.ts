import { z } from "zod";

export const superAdminSignInSchema = z.object({
  idToken: z.string().min(1),
});
export type SuperAdminSignInDto = z.infer<typeof superAdminSignInSchema>;

export const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().max(80).optional(),
});
export type InviteAdminDto = z.infer<typeof inviteAdminSchema>;

export const vendorActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    // Internal note. Shown to the vendor in their own dashboard, never to
    // shoppers — the storefront shows a neutral "unavailable" screen.
    reason: z.string().trim().min(1, "Give a reason — the vendor sees this in their dashboard"),
  }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("verify") }),
  z.object({ action: z.literal("unverify") }),
]);
export type VendorActionDto = z.infer<typeof vendorActionSchema>;

export const reviewVerificationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    // Mandatory. The vendor sees this on their own verification page and the
    // next reviewer sees it as "last rejection reason" — a rejection with no
    // stated cause helps nobody.
    reason: z.string().trim().min(1, "Give a reason — the vendor sees it and needs it to fix the problem"),
  }),
]);
export type ReviewVerificationDto = z.infer<typeof reviewVerificationSchema>;
