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

// Without this, Next.js has nothing to mark the route dynamic on: it never
// reads a cookie (there is none yet, this is what mints the first one) or
// any other request signal Next's static analysis recognises — only
// `cookies().set()`, a write. That let it get optimized as a cacheable
// response in production, and Vercel's edge strips Set-Cookie from anything
// it treats as cacheable — sign-in returned 200 with a real token, minted
// nothing, and every next request bounced straight back to /superadmin/login
// with no error anywhere. Explicit no-store on the response too, so this
// doesn't depend on the route-segment config alone catching every caching
// layer in front of it.
export const dynamic = "force-dynamic";

function noStoreJson<T>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, { ...init, headers: { ...init?.headers, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const result = await apiPublic<{ token: string }>("/superadmin/auth/session", { method: "POST", body });
    await setSuperAdminCookie(result.token);
    return noStoreJson({ ok: true });
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

export async function DELETE() {
  await clearSuperAdminCookie();
  return noStoreJson({ ok: true });
}
