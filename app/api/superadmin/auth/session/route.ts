import { NextResponse } from "next/server";
import { apiPublic, ApiError } from "@/lib/api-client";
import { setSuperAdminCookie, clearSuperAdminCookie } from "@/lib/session-cookie";

// Sign-in against the NestJS API, then mint the cookie here — same split as
// app/api/auth/session/route.ts. The API verifies the Google identity,
// checks the SuperAdmin allowlist, and mints a JWT, but returns it in the
// response body and sets nothing. This route turns it into an httpOnly
// cookie. There is deliberately no signup path anywhere in this chain: a row
// in SuperAdmin (bootstrap script, or another admin's invite) is the only
// way in.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const result = await apiPublic<{ token: string }>("/superadmin/auth/session", { method: "POST", body });
    await setSuperAdminCookie(result.token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Couldn't reach the sign-in service. Please try again.", code: "upstream_unreachable" },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  await clearSuperAdminCookie();
  return NextResponse.json({ ok: true });
}
