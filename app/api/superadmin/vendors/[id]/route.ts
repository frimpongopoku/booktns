import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { findVendorOwner, verifyPerson, unverifyPerson } from "@/lib/verification";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const actionSchema = z.discriminatedUnion("action", [
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

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const vendor = await db.vendor.findUnique({ where: { id }, select: { id: true } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found", code: "not_found" }, { status: 404 });
  }

  switch (parsed.data.action) {
    case "suspend":
      await db.vendor.update({
        where: { id },
        data: { suspended: true, suspendedAt: new Date(), suspendedReason: parsed.data.reason },
      });
      return NextResponse.json({ ok: true });

    case "unsuspend":
      await db.vendor.update({
        where: { id },
        data: { suspended: false, suspendedAt: null, suspendedReason: null },
      });
      return NextResponse.json({ ok: true });

    // Direct verify/unverify, for a vendor whose identity was confirmed
    // outside the application flow. Goes through the same cascade helpers as
    // an approval, so the person and all their shops stay in step.
    case "verify": {
      const owner = await findVendorOwner(id);
      if (!owner) {
        return NextResponse.json({ error: "This vendor has no active owner.", code: "no_owner" }, { status: 409 });
      }
      const cascade = await verifyPerson(owner.id);
      return NextResponse.json({ ok: true, verifiedVendors: cascade.vendorNames });
    }

    case "unverify": {
      const owner = await findVendorOwner(id);
      if (!owner) {
        return NextResponse.json({ error: "This vendor has no active owner.", code: "no_owner" }, { status: 409 });
      }
      const cascade = await unverifyPerson(owner.id);
      return NextResponse.json({ ok: true, unverifiedVendors: cascade.vendorNames });
    }
  }
}
