import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getSession } from "@/lib/auth";
import { findMembership } from "@/lib/memberships";

const bodySchema = z.object({
  vendorId: z.string().min(1),
});

// Switches which vendor space the signed-in person is occupying, reissuing
// the session cookie with the staffId, vendorId and — critically — the role
// they hold at the *target* vendor. Someone who is an Owner at one shop and
// a Service stylist at another must land with the second role when they
// switch, never carry the first across.
//
// Deliberately re-derives the membership from the database on every call
// rather than trusting a list the client was handed at sign-in: staff
// access can be revoked between page loads, and the cookie is the thing
// every other guard in the app trusts.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in", code: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing vendorId", code: "invalid_request" }, { status: 400 });
  }

  const membership = await findMembership(session.email, parsed.data.vendorId);
  if (!membership) {
    // Same wording whether the vendor doesn't exist or this person simply
    // isn't on it — a signed-in user shouldn't be able to probe which
    // vendor ids are real.
    return NextResponse.json(
      { error: "You don't have access to that shop", code: "forbidden" },
      { status: 403 }
    );
  }

  const staff = await db.staff.findUnique({
    where: { id: membership.staffId },
    select: { id: true, vendorId: true, name: true, role: true, email: true, vendor: { select: { name: true } } },
  });
  if (!staff) {
    return NextResponse.json({ error: "You don't have access to that shop", code: "forbidden" }, { status: 403 });
  }

  await createSession(staff);
  return NextResponse.json({ ok: true, vendorId: staff.vendorId, role: staff.role });
}
