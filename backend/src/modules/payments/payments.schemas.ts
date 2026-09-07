import { z } from "zod";

const PAYMENT_METHOD_TYPES = ["momo", "bank", "cash"] as const;
const MOBILE_NETWORK_VALUES = ["MTN", "Telecel", "AirtelTigo"] as const;

export const createPaymentMethodSchema = z
  .object({
    type: z.enum(PAYMENT_METHOD_TYPES),
    label: z.string().trim().min(1, "Label is required"),
    accountName: z.string().trim().min(1, "Account name is required"),
    accountNumber: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    network: z.enum(MOBILE_NETWORK_VALUES).optional(),
  })
  .refine((data) => data.type === "cash" || Boolean(data.accountNumber), {
    message: "Account number is required for this payment type",
    path: ["accountNumber"],
  })
  // A customer paying by MoMo has to pick the same network the money is on
  // before their wallet app will even dial the code — a MoMo entry with no
  // network is unusable, not just incomplete.
  .refine((data) => data.type !== "momo" || Boolean(data.network), {
    message: "Select which network this number is on",
    path: ["network"],
  });
export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;

export const updatePaymentMethodSchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES).optional(),
  label: z.string().trim().min(1, "Label is required").optional(),
  accountName: z.string().trim().min(1, "Account name is required").optional(),
  accountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  network: z.enum(MOBILE_NETWORK_VALUES).optional(),
  active: z.boolean().optional(),
});
export type UpdatePaymentMethodDto = z.infer<typeof updatePaymentMethodSchema>;
