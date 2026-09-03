import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The liveness probe. Deliberately trivial and dependency-free.
//
// Use THIS as the hosting platform's health-check target, never /api/health —
// that one round-trips to third-party APIs with a 3s budget each, so an email
// provider having a bad minute could make the platform conclude the whole app
// is down and restart it. /api/health is a diagnostic page for humans and for
// an uptime monitor; this is the probe.
export function GET() {
  return NextResponse.json({ status: "ok" });
}
