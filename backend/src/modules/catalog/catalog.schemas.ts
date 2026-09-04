import { z } from "zod";

// SERVICE_CATEGORIES lives in the frontend's types/index.ts as a shared
// const tuple. Duplicated here rather than imported across the repo
// boundary — the two projects don't share a types package, and this list
// changes rarely enough that keeping them in sync by hand is cheap compared
// to wiring up a shared package for one array.
export const SERVICE_CATEGORIES = [
  "Hair", "Nails", "Skin", "Lashes", "Brows", "Makeup", "Barbering", "Waxing", "Massage", "Other",
] as const;

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.enum(SERVICE_CATEGORIES),
  durationMinutes: z.number().int().positive("Duration must be a positive number of minutes"),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative"),
  description: z.string().trim().optional(),
  featured: z.boolean().optional(),
});
export type CreateServiceDto = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  durationMinutes: z.number().int().positive("Duration must be a positive number of minutes").optional(),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative").optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;

const MAX_IMAGES_PER_PRODUCT = 5;

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative"),
  stockCount: z.number().int().nonnegative("Stock count cannot be negative"),
  lowStockThreshold: z.number().int().nonnegative("Low-stock threshold cannot be negative"),
  description: z.string().trim().optional(),
  images: z.array(z.string().trim().url()).max(MAX_IMAGES_PER_PRODUCT, `Up to ${MAX_IMAGES_PER_PRODUCT} photos per product`).optional(),
  featured: z.boolean().optional(),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative").optional(),
  stockCount: z.number().int().nonnegative("Stock count cannot be negative").optional(),
  lowStockThreshold: z.number().int().nonnegative("Low-stock threshold cannot be negative").optional(),
  description: z.string().trim().optional(),
  images: z.array(z.string().trim().url()).max(MAX_IMAGES_PER_PRODUCT, `Up to ${MAX_IMAGES_PER_PRODUCT} photos per product`).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
