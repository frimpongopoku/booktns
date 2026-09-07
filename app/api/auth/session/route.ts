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

interface SignInResponse {
  token: string;
  memberships: unknown[];
}

// Without this, Next.js has nothing to mark the route dynamic on: it never
// reads a cookie (there is none yet, this is what mints the first one) or
// any other request signal Next's static analysis recognises — only
// `cookies().set()`, a write. That let it get optimized as a cacheable
// response in production, and Vercel's edge strips Set-Cookie from anything
// it treats as cacheable — sign-in would return 200 with a real token, mint
// nothing, and every next request looked signed-out again. Explicit
// no-store on the response too, so this doesn't depend on the route-segment
// config alone catching every caching layer in front of it.
export const dynamic = "force-dynamic";

function noStoreJson<T>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, { ...init, headers: { ...init?.headers, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const result = await apiPublic<SignInResponse>("/auth/session", { method: "POST", body });
    await setSessionCookie(result.token);
    // The token itself is deliberately NOT returned to the caller — it goes
    // into the httpOnly cookie and nowhere else. The client only needs to
    // know which shops this person belongs to.
    return noStoreJson({ ok: true, memberships: result.memberships });
  } catch (err) {
    if (err instanceof ApiError) {
      return noStoreJson({ error: err.message, code: err.code }, { status: err.status });
    }
    return noStoreJson(
      { error: "Couldn't reach the sign-in service. Please try again.", code: "upstream_unreachable" },
      { status: 502 },
    );
  }
}

// Signing out is just deleting our own cookie — there is no server-side
// session to destroy, because the API holds no session state.
export async function DELETE() {
  await clearSessionCookie();
  return noStoreJson({ ok: true });
}
