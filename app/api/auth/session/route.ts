import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, clearSession } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";

const bodySchema = z.object({
  idToken: z.string().min(1),
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

  const staff = await db.staff.findFirst({
    where: { email: { equals: verified.email, mode: "insensitive" }, active: true },
    include: { vendor: { select: { name: true } } },
  });

  if (!staff) {
    return NextResponse.json(
      {
        error: "This Google account isn't linked to a Booktns staff account. Ask your vendor owner to add you.",
        code: "not_registered",
      },
      { status: 403 }
    );
  }

  await createSession(staff);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
