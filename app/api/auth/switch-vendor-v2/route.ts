import { NextResponse } from "next/server";
import { apiServer, ApiError } from "@/lib/api-client";
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const result = await apiServer<SwitchResponse>("/auth/switch-vendor", { method: "POST", body });
    await setSessionCookie(result.token);
    return NextResponse.json({ ok: true, vendorId: result.vendorId, role: result.role });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Couldn't reach the server. Please try again.", code: "upstream_unreachable" },
      { status: 502 },
    );
  }
}
