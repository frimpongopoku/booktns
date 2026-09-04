import { z } from "zod";

// Moved verbatim from app/api/bookings/route.ts — the messages are surfaced
// inline in the booking form, so rewording them changes the UI.
export const createBookingSchema = z.object({
  vendorSlug: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "Name is required"),
  customerPhone: z.string().trim().min(1, "Phone number is required"),
  customerEmail: z.string().trim().email("Enter a valid email address"),
  serviceIds: z.array(z.string().trim().min(1)).min(1, "Select at least one service"),
  products: z
    .array(z.object({ productId: z.string().trim().min(1), quantity: z.number().int().positive() }))
    .optional(),
  staffPreferenceId: z.string().trim().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  paymentMethodId: z.string().trim().nullable().optional(),
  notes: z.string().trim().optional(),
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
