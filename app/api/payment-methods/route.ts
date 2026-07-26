import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializePaymentMethod } from "@/lib/serialize";

const PAYMENT_METHOD_TYPES = ["momo", "bank", "cash"] as const;

const createSchema = z
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

export async function GET() {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const methods = await db.paymentMethod.findMany({
    where: { vendorId: auth.session.vendorId },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ paymentMethods: methods.map(serializePaymentMethod) });
}

export async function POST(request: Request) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const highestOrder = await db.paymentMethod.aggregate({
    where: { vendorId: auth.session.vendorId },
    _max: { displayOrder: true },
  });

  const method = await db.paymentMethod.create({
    data: {
      vendorId: auth.session.vendorId,
      type: parsed.data.type,
      label: parsed.data.label,
      accountName: parsed.data.accountName,
      accountNumber: parsed.data.accountNumber,
      bankName: parsed.data.bankName,
      network: parsed.data.network,
      displayOrder: (highestOrder._max.displayOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ paymentMethod: serializePaymentMethod(method) }, { status: 201 });
}
