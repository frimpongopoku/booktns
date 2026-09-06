import { z } from "zod";
import { SERVICE_CATEGORIES } from "../catalog/catalog.schemas";

// Duplicated from staff.schemas.ts rather than exported/imported across
// modules — same reasoning as SERVICE_CATEGORIES's own duplication comment
// in catalog.schemas.ts: this list changes rarely enough that keeping it in
// sync by hand is cheap.
const STAFF_ROLES = ["Owner", "Management", "Service"] as const;

// Duplicated from payments.schemas.ts for the same reason.
const PAYMENT_METHOD_TYPES = ["momo", "bank", "cash"] as const;

// Loosely typed on purpose: onboarding.service.ts filters out incomplete
// staff/service/payment-method rows (a blank row left over from the wizard
// UI) rather than rejecting the whole submission — this schema only
// guarantees shape, not "every row is complete." The business-info fields
// ARE required, since there's no filtering step for those.
export const createOnboardingSchema = z.object({
  businessInfo: z.object({
    name: z.string().trim().min(1, "Business name is required"),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+$/, "Slug must be lowercase letters and numbers only"),
    description: z.string(),
    location: z.string(),
    hours: z.string(),
    phone: z.string(),
  }),
  staffList: z.array(z.object({
    name: z.string(),
    email: z.string(),
    role: z.string(),
  })),
  services: z.array(z.object({
    name: z.string(),
    duration: z.string(),
    price: z.string(),
    category: z.string(),
  })),
  paymentMethods: z.array(z.object({
    type: z.string(),
    label: z.string(),
    number: z.string(),
    name: z.string(),
  })),
});
export type CreateOnboardingDto = z.infer<typeof createOnboardingSchema>;

export { STAFF_ROLES, PAYMENT_METHOD_TYPES, SERVICE_CATEGORIES };
