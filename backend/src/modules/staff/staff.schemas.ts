import { z } from "zod";

const STAFF_ROLES = ["Owner", "Management", "Service"] as const;
const SERVICE_CATEGORIES = [
  "Hair", "Nails", "Skin", "Lashes", "Brows", "Makeup", "Barbering", "Waxing", "Massage", "Other",
] as const;

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  role: z.enum(STAFF_ROLES),
  roleDetail: z.string().trim().optional(),
  botAccess: z.boolean().optional(),
  serviceCategories: z.array(z.enum(SERVICE_CATEGORIES)).optional(),
});
export type CreateStaffDto = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().email("Enter a valid email address").optional(),
  phone: z.string().trim().optional(),
  role: z.enum(STAFF_ROLES).optional(),
  roleDetail: z.string().trim().optional(),
  botAccess: z.boolean().optional(),
  active: z.boolean().optional(),
  serviceCategories: z.array(z.enum(SERVICE_CATEGORIES)).optional(),
});
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;
