import { NextResponse } from "next/server";
import { apiPublic, ApiError } from "@/lib/api-client";
import { setSessionCookie, clearSessionCookie } from "@/lib/session-cookie";

// Sign-in against the NestJS API, then mint the cookie here.
//
// The split matters: the API verifies the Google identity, checks the staff
// allowlist and mints a JWT — but it returns that JWT in the response body
// and sets nothing. This route is what turns it into an httpOnly cookie,
// scoped host-only to whatever domain the browser is on. That is what makes
// a vendor signing in on their own custom domain work with no configuration.
//
// Named session-v2 while the original cookie-minting route still backs the
// un-migrated Next.js API routes; see backend/MIGRATION.md.
interface SignInResponse {
  token: string;
  memberships: unknown[];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const result = await apiPublic<SignInResponse>("/auth/session", { method: "POST", body });
    await setSessionCookie(result.token);
    // The token itself is deliberately NOT returned to the caller — it goes
    // into the httpOnly cookie and nowhere else. The client only needs to
    // know which shops this person belongs to.
    return NextResponse.json({ ok: true, memberships: result.memberships });
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

// Signing out is just deleting our own cookie — there is no server-side
// session to destroy, because the API holds no session state.
export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
