import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import sharp from "sharp";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getPrivateStorage } from "../../common/lib/private-storage";
import { normalizeGhanaCardNumber, isValidGhanaCardNumber } from "../../common/lib/verification";
import { logger } from "../../common/lib/logger";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function normalizeDocumentImage(input: Buffer, maxDimension: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

export interface SubmitVerificationInput {
  legalName: string;
  ghanaCardNumber: string;
  idPhoto?: Express.Multer.File;
  selfiePhoto?: Express.Multer.File;
}

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  // Vendor-side submission. Owner-only at the controller: this is the
  // owner's own government ID, and Management/Service staff have no
  // business submitting or seeing it.
  async submit(vendorId: string, input: SubmitVerificationInput) {
    const existing = await this.prisma.verificationRequest.findUnique({ where: { vendorId }, select: { status: true } });
    if (existing?.status === "PENDING") {
      throw new ConflictException({ error: "Your verification is already being reviewed. We'll email you when it's done.", code: "already_pending" });
    }
    if (existing?.status === "APPROVED") {
      throw new ConflictException({ error: "You're already verified.", code: "already_verified" });
    }

    const legalName = input.legalName.trim();
    if (!legalName) {
      throw new BadRequestException({ error: "Enter your full name as it appears on your ID", code: "invalid_request" });
    }

    const cardNumber = normalizeGhanaCardNumber(input.ghanaCardNumber ?? "");
    if (!isValidGhanaCardNumber(cardNumber)) {
      throw new BadRequestException({ error: "Enter a valid Ghana Card number, in the form GHA-000000000-0.", code: "invalid_request" });
    }

    if (!input.idPhoto) {
      throw new BadRequestException({ error: "Attach a photo of your Ghana Card", code: "invalid_request" });
    }
    const selfiePhoto = input.selfiePhoto && input.selfiePhoto.size > 0 ? input.selfiePhoto : undefined;

    for (const [label, file] of [["Ghana Card photo", input.idPhoto], ["Selfie", selfiePhoto]] as const) {
      if (!file) continue;
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        throw new BadRequestException({ error: `${label} must be a JPEG, PNG, or WebP image.`, code: "invalid_request" });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException({ error: `${label} must be under 10MB.`, code: "invalid_request" });
      }
    }

    const storage = getPrivateStorage();

    // Deterministic keys, so a resubmission overwrites the previous
    // documents rather than leaving orphaned ID scans behind in storage.
    const idKey = `verification/${vendorId}/id-photo.webp`;
    const selfieKey = selfiePhoto ? `verification/${vendorId}/selfie.webp` : null;

    let idBuffer: Buffer;
    let selfieBuffer: Buffer | null = null;
    try {
      idBuffer = await normalizeDocumentImage(input.idPhoto.buffer, 2000);
      if (selfiePhoto) selfieBuffer = await normalizeDocumentImage(selfiePhoto.buffer, 1200);
    } catch (err) {
      logger.warn("verification document could not be decoded", { vendorId, err });
      throw new BadRequestException({
        error: "We couldn't read one of those images. Try taking the photo again, or use a different file.",
        code: "invalid_request",
      });
    }

    try {
      await storage.putObject(idKey, idBuffer, "image/webp");
      if (selfieBuffer && selfieKey) await storage.putObject(selfieKey, selfieBuffer, "image/webp");
    } catch (err) {
      logger.error("verification document upload failed", { vendorId, err });
      throw new InternalServerErrorException({ error: "We couldn't save your documents. Please try again.", code: "server_error" });
    }

    // Overwrite the single application row and move the vendor to PENDING
    // together — a mismatch would strand the vendor's status display.
    await this.prisma.$transaction([
      this.prisma.verificationRequest.upsert({
        where: { vendorId },
        create: { vendorId, legalName, ghanaCardNumber: cardNumber, idPhotoKey: idKey, selfiePhotoKey: selfieKey },
        update: {
          legalName,
          ghanaCardNumber: cardNumber,
          idPhotoKey: idKey,
          selfiePhotoKey: selfieKey,
          status: "PENDING",
          rejectionReason: null,
          reviewedBySuperAdminId: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
      }),
      this.prisma.vendor.update({ where: { id: vendorId }, data: { verificationStatus: "PENDING" } }),
    ]);

    return { ok: true, status: "PENDING" as const };
  }

  // The vendor's own view of where their application stands.
  async status(vendorId: string) {
    const [vendor, application] = await Promise.all([
      this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { verificationStatus: true, verifiedAt: true } }),
      this.prisma.verificationRequest.findUnique({
        where: { vendorId },
        // Deliberately no photo keys — must never travel in an API response.
        select: { legalName: true, ghanaCardNumber: true, status: true, rejectionReason: true, submittedAt: true, reviewedAt: true },
      }),
    ]);
    if (!vendor) throw new NotFoundException({ error: "Vendor not found", code: "not_found" });
    return { status: vendor.verificationStatus, verifiedAt: vendor.verifiedAt, application: application ?? null };
  }
}
