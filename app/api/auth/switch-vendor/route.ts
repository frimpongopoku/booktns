import { NextResponse } from "next/server";
import { apiServer, ApiError } from "@/lib/api-client.server";
import { setSessionCookie } from "@/lib/session-cookie";

// Switching shops mints a BRAND NEW token scoped to the target vendor, with
// the role held there. We overwrite the one cookie with it — there is no
// token to diff and no client-side session cache to invalidate, because the
// token never lived in JavaScript.
//
// Authorization happens on the API: it re-derives the membership from the
// database against the email in the *current* verified token. A vendorId
// from the client is a request, never an assertion.
interface SwitchResponse {
  token: string;
  vendorId: string;
  role: string;
}

// apiServer() reads the existing session cookie, which is itself enough of
// a dynamic signal to keep Next.js from statically optimizing this route —
// but the sibling routes that mint a cookie without ever reading one
// (app/api/auth/session, app/api/superadmin/auth/session) needed this
// explicitly, since they had no such signal and got cached, silently
// stripping Set-Cookie. Declared here too rather than relying on the read
// alone, so nothing about "does this route still count as dynamic" is left
// to Next's inference.
export const dynamic = "force-dynamic";

function noStoreJson<T>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, { ...init, headers: { ...init?.headers, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const result = await apiServer<SwitchResponse>("/auth/switch-vendor", { method: "POST", body });
    await setSessionCookie(result.token);
    return noStoreJson({ ok: true, vendorId: result.vendorId, role: result.role });
  } catch (err) {
    if (err instanceof ApiError) {
      return noStoreJson({ error: err.message, code: err.code }, { status: err.status });
    }
    return noStoreJson(
      { error: "Couldn't reach the server. Please try again.", code: "upstream_unreachable" },
      { status: 502 },
    );
  }
}
