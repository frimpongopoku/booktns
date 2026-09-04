import { z } from "zod";

const PAYMENT_METHOD_TYPES = ["momo", "bank", "cash"] as const;

export const createPaymentMethodSchema = z
  .object({
    type: z.enum(PAYMENT_METHOD_TYPES),
    label: z.string().trim().min(1, "Label is required"),
    accountName: z.string().trim().min(1, "Account name is required"),
    accountNumber: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    network: z.string().trim().optional(),
  })
  .refine((data) => data.type === "cash" || Boolean(data.accountNumber), {
    message: "Account number is required for this payment type",
    path: ["accountNumber"],
  });
export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;

export const updatePaymentMethodSchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES).optional(),
  label: z.string().trim().min(1, "Label is required").optional(),
  accountName: z.string().trim().min(1, "Account name is required").optional(),
  accountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  network: z.string().trim().optional(),
  active: z.boolean().optional(),
});
export type UpdatePaymentMethodDto = z.infer<typeof updatePaymentMethodSchema>;
