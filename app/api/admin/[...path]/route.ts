import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api-client";
import { readSessionToken, readSuperAdminToken } from "@/lib/session-cookie";

// Backend-for-frontend proxy. Every authenticated call from browser
// JavaScript comes here first, same-origin, and this route re-attaches the
// session as an Authorization header before calling the real API.
//
// The point is that the JWT never reaches browser JavaScript. It lives in an
// httpOnly cookie the browser cannot read, so XSS cannot exfiltrate it, and
// no client code has to remember to attach anything. It also means the API
// needs no cross-origin credentialed CORS — which is what would otherwise
// force an origin allowlist that can never contain every vendor's custom
// domain.
//
// Superadmin console calls are routed by path prefix and pick up the other
// cookie. The two token spaces are signed with different secrets on the API,
// so sending the wrong one fails signature verification outright rather than
// relying on a discriminator check.
async function proxy(request: Request, path: string[]): Promise<Response> {
  const target = `/${path.join("/")}`;
  const isSuperAdmin = target.startsWith("/superadmin");
  const token = isSuperAdmin ? await readSuperAdminToken() : await readSessionToken();

  if (!token) {
    return NextResponse.json({ error: "Not signed in", code: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(apiUrl(target));
  url.search = new URL(request.url).search;

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  // Streamed through rather than parsed: media upload posts multipart bodies
  // that must not be buffered or re-encoded here.
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    // The API is a different origin; nothing about this call is cookie-based.
    cache: "no-store",
  });

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      // Never cache an authenticated response at any layer between here and
      // the browser — these are per-session by definition.
      "Cache-Control": "private, no-store",
    },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Ctx) {
  return proxy(request, (await params).path);
}
export async function POST(request: Request, { params }: Ctx) {
  return proxy(request, (await params).path);
}
export async function PATCH(request: Request, { params }: Ctx) {
  return proxy(request, (await params).path);
}
export async function PUT(request: Request, { params }: Ctx) {
  return proxy(request, (await params).path);
}
export async function DELETE(request: Request, { params }: Ctx) {
  return proxy(request, (await params).path);
}
