import { z } from "zod";

export const createOrderSchema = z.object({
  vendorSlug: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "Name is required"),
  customerPhone: z.string().trim().min(1, "Phone number is required"),
  items: z.array(z.object({ productId: z.string().trim().min(1), quantity: z.number().int().positive() })).min(1, "Your cart is empty"),
  paymentMethodId: z.string().trim().nullable().optional(),
  deliveryPreference: z.enum(["Pickup", "Delivery"]),
  notes: z.string().trim().optional(),
});
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

const ORDER_STATUSES = ["new", "processing", "ready", "completed", "cancelled"] as const;
export const updateOrderSchema = z.object({ status: z.enum(ORDER_STATUSES) });
export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;
