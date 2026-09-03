import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getPrivateStorage } from "@/lib/private-storage";
import { normalizeGhanaCardNumber, isValidGhanaCardNumber } from "@/lib/verification";
import { logger } from "@/lib/logger";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function normalizeDocumentImage(input: Buffer, maxDimension: number): Promise<Buffer> {
  return sharp(input)
    .rotate() // apply EXIF orientation before metadata is stripped
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

// Vendor-side submission. Owner-only: this is the owner's own government ID,
// and a Management or Service staff member has no business submitting it —
// or seeing it — on their behalf.
export async function POST(request: Request) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const existing = await db.verificationRequest.findUnique({
    where: { vendorId: auth.session.vendorId },
    select: { status: true },
  });

  // You can't resubmit while a reviewer is looking at it.
  if (existing?.status === "PENDING") {
    return NextResponse.json(
      { error: "Your verification is already being reviewed. We'll email you when it's done.", code: "already_pending" },
      { status: 409 }
    );
  }
  if (existing?.status === "APPROVED") {
    return NextResponse.json(
      { error: "You're already verified.", code: "already_verified" },
      { status: 409 }
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid request", code: "invalid_request" }, { status: 400 });
  }

  const legalName = String(form.get("legalName") ?? "").trim();
  if (!legalName) {
    return NextResponse.json({ error: "Enter your full name as it appears on your ID", code: "invalid_request" }, { status: 400 });
  }

  const cardNumber = normalizeGhanaCardNumber(String(form.get("ghanaCardNumber") ?? ""));
  if (!isValidGhanaCardNumber(cardNumber)) {
    return NextResponse.json(
      { error: "Enter a valid Ghana Card number, in the form GHA-000000000-0.", code: "invalid_request" },
      { status: 400 }
    );
  }

  const idPhoto = form.get("idPhoto");
  if (!(idPhoto instanceof File)) {
    return NextResponse.json({ error: "Attach a photo of your Ghana Card", code: "invalid_request" }, { status: 400 });
  }

  const selfie = form.get("selfiePhoto");
  const selfiePhoto = selfie instanceof File && selfie.size > 0 ? selfie : null;

  for (const [label, file] of [["Ghana Card photo", idPhoto], ["Selfie", selfiePhoto]] as const) {
    if (!file) continue;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `${label} must be a JPEG, PNG, or WebP image.`, code: "invalid_request" },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `${label} must be under 10MB.`, code: "invalid_request" }, { status: 400 });
    }
  }

  const storage = getPrivateStorage();

  // Deterministic keys, so a resubmission overwrites the previous documents
  // rather than leaving orphaned ID scans behind in storage.
  const idKey = `verification/${auth.session.vendorId}/id-photo.webp`;
  const selfieKey = selfiePhoto ? `verification/${auth.session.vendorId}/selfie.webp` : null;

  // Decoding and storing are separated because they fail for different
  // reasons and the vendor can only act on one of them: an image we can't
  // read is their problem to fix (retake the photo), a storage failure is
  // ours. Collapsing both into one 500 tells a vendor with a corrupt upload
  // to "try again", which will fail identically every time.
  let idBuffer: Buffer;
  let selfieBuffer: Buffer | null = null;
  try {
    idBuffer = await normalizeDocumentImage(Buffer.from(await idPhoto.arrayBuffer()), 2000);
    if (selfiePhoto) {
      selfieBuffer = await normalizeDocumentImage(Buffer.from(await selfiePhoto.arrayBuffer()), 1200);
    }
  } catch (err) {
    logger.warn("verification document could not be decoded", { vendorId: auth.session.vendorId, err });
    return NextResponse.json(
      {
        error: "We couldn't read one of those images. Try taking the photo again, or use a different file.",
        code: "invalid_request",
      },
      { status: 400 }
    );
  }

  try {
    await storage.putObject(idKey, idBuffer, "image/webp");
    if (selfieBuffer && selfieKey) {
      await storage.putObject(selfieKey, selfieBuffer, "image/webp");
    }
  } catch (err) {
    logger.error("verification document upload failed", { vendorId: auth.session.vendorId, err });
    return NextResponse.json(
      { error: "We couldn't save your documents. Please try again.", code: "server_error" },
      { status: 500 }
    );
  }

  // Overwrite the single application row and move the vendor to PENDING
  // together — a vendor showing "pending" with no application to review, or
  // the reverse, would strand them.
  await db.$transaction([
    db.verificationRequest.upsert({
      where: { vendorId: auth.session.vendorId },
      create: {
        vendorId: auth.session.vendorId,
        legalName,
        ghanaCardNumber: cardNumber,
        idPhotoKey: idKey,
        selfiePhotoKey: selfieKey,
      },
      update: {
        legalName,
        ghanaCardNumber: cardNumber,
        idPhotoKey: idKey,
        selfiePhotoKey: selfieKey,
        status: "PENDING",
        // A resubmission is a clean slate — the previous reviewer's decision
        // must not linger on the row the next reviewer opens.
        rejectionReason: null,
        reviewedBySuperAdminId: null,
        reviewedAt: null,
        submittedAt: new Date(),
      },
    }),
    db.vendor.update({
      where: { id: auth.session.vendorId },
      data: { verificationStatus: "PENDING" },
    }),
  ]);

  return NextResponse.json({ ok: true, status: "PENDING" }, { status: 201 });
}

// The vendor's own view of where their application stands.
export async function GET() {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const [vendor, application] = await Promise.all([
    db.vendor.findUnique({
      where: { id: auth.session.vendorId },
      select: { verificationStatus: true, verifiedAt: true },
    }),
    db.verificationRequest.findUnique({
      where: { vendorId: auth.session.vendorId },
      // Deliberately no photo keys — the vendor's own UI has no use for them
      // and they must not travel in any API response.
      select: { legalName: true, ghanaCardNumber: true, status: true, rejectionReason: true, submittedAt: true, reviewedAt: true },
    }),
  ]);

  if (!vendor) return NextResponse.json({ error: "Vendor not found", code: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: vendor.verificationStatus,
    verifiedAt: vendor.verifiedAt,
    application: application ?? null,
  });
}
