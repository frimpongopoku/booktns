import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { getPrivateStorage } from "@/lib/private-storage";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string; kind: string }>;
}

// Reviewers see identity documents through this route only: the bytes are
// proxied through the app, behind the superadmin session, never redirected to
// storage. There is no signed URL and no public link — lib/private-storage.ts
// has no publicUrl() to produce one with.
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id, kind } = await params;
  if (kind !== "id" && kind !== "selfie") {
    return NextResponse.json({ error: 'kind must be "id" or "selfie"', code: "invalid_request" }, { status: 400 });
  }

  const application = await db.verificationRequest.findUnique({
    where: { id },
    select: { idPhotoKey: true, selfiePhotoKey: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found", code: "not_found" }, { status: 404 });
  }

  const key = kind === "id" ? application.idPhotoKey : application.selfiePhotoKey;
  if (!key) {
    return NextResponse.json({ error: "No photo of that kind was submitted", code: "not_found" }, { status: 404 });
  }

  try {
    const { buffer, contentType } = await getPrivateStorage().getObject(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        // Never cached by a browser, a proxy, or a CDN. These are government
        // ID scans; a cached copy sitting in shared infrastructure defeats
        // the point of the private bucket.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("verification photo read failed", { applicationId: id, kind, err });
    return NextResponse.json({ error: "Couldn't load that document", code: "server_error" }, { status: 500 });
  }
}
