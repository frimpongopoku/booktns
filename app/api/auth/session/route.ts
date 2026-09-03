import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, clearSession } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { getMembershipsForEmail } from "@/lib/memberships";

const bodySchema = z.object({
  idToken: z.string().min(1),
  // Which shop to land in, when the account belongs to several. Optional:
  // omitted on a first sign-in, at which point the server picks (see below)
  // and the client can offer a switcher afterwards.
  vendorId: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid idToken", code: "invalid_request" }, { status: 400 });
  }

  const verified = await verifyFirebaseIdToken(parsed.data.idToken);
  if (!verified || !verified.emailVerified) {
    return NextResponse.json({ error: "Google sign-in could not be verified", code: "invalid_token" }, { status: 401 });
  }

  const memberships = await getMembershipsForEmail(verified.email);

  if (memberships.length === 0) {
    return NextResponse.json(
      {
        error: "This Google account isn't linked to a Booktns staff account. Ask your vendor owner to add you.",
        code: "not_registered",
      },
      { status: 403 }
    );
  }

  // A requested vendor is honoured only if this email genuinely has an
  // active membership there — the id comes from the client, so it is a
  // request, never an assertion. Anything else falls back to the first
  // (oldest) membership rather than failing the sign-in.
  const requested = parsed.data.vendorId
    ? memberships.find((m) => m.vendorId === parsed.data.vendorId)
    : undefined;
  const membership = requested ?? memberships[0];

  const staff = await db.staff.findUnique({
    where: { id: membership.staffId },
    select: { id: true, vendorId: true, name: true, role: true, email: true, vendor: { select: { name: true } } },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff account not found", code: "not_registered" }, { status: 403 });
  }

  await createSession(staff);
  return NextResponse.json({ ok: true, memberships });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
