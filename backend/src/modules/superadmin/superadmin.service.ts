import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { verifyFirebaseIdToken } from "../../common/lib/firebase-admin";
import { getPlatformOverview, realVendorsFilter } from "../../common/lib/superadmin";
import { findVendorOwner, verifyPerson, unverifyPerson } from "../../common/lib/verification";
import { getPrivateStorage } from "../../common/lib/private-storage";
import { sendSuperAdminInviteEmail, sendVerificationApprovedEmail, sendVerificationRejectedEmail } from "../../common/lib/email";
import { logger } from "../../common/lib/logger";
import { SessionService } from "../auth/session.service";
import type { InviteAdminDto, VendorActionDto, ReviewVerificationDto } from "./superadmin.schemas";

const REQUEST_TO_VENDOR_STATUS = {
  PENDING: "PENDING",
  APPROVED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  // --- Auth --------------------------------------------------------------

  async signIn(idToken: string): Promise<{ token: string }> {
    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified || !verified.emailVerified) {
      throw new UnauthorizedException({ error: "Google sign-in could not be verified", code: "invalid_token" });
    }

    const admin = await this.prisma.superAdmin.findFirst({
      where: { email: { equals: verified.email, mode: "insensitive" } },
    });
    // Same generic message whether the email is unknown, an ordinary vendor
    // account, or a removed superadmin — never confirm whether an account
    // exists (CLAUDE.md § Superadmin Console, rule 4).
    if (!admin) {
      throw new ForbiddenException({
        error: "This Google account is not authorized for the superadmin console.",
        code: "not_authorized",
      });
    }

    if (!admin.acceptedAt) {
      await this.prisma.superAdmin.update({ where: { id: admin.id }, data: { acceptedAt: new Date() } });
    }

    return { token: await this.sessions.issueSuperAdminToken(admin) };
  }

  // --- Overview ------------------------------------------------------------

  // PlatformOverview already carries pendingVerifications as one of its own
  // fields — the console layout (which needs just that count on every page
  // load, for its "N waiting" badge) reads it off this same response rather
  // than a second lightweight endpoint. This is a low-traffic internal
  // console; the full ~10-query aggregate isn't worth avoiding here.
  async overview() {
    return { overview: await getPlatformOverview() };
  }

  // --- Admins --------------------------------------------------------------

  async listAdmins() {
    const admins = await this.prisma.superAdmin.findMany({ orderBy: { invitedAt: "asc" } });
    return { admins };
  }

  async inviteAdmin(dto: InviteAdminDto, invitedByEmail: string) {
    const existing = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({ error: "That email already has access.", code: "already_exists" });
    }

    const admin = await this.prisma.superAdmin.create({
      data: { email: dto.email, name: dto.name || null },
    });

    // A floating promise, not awaited into the response: Railway is a
    // long-lived process, not a serverless function that can freeze the
    // instant a response is sent, so there's no need for Vercel's after().
    sendSuperAdminInviteEmail({ to: admin.email, invitedBy: invitedByEmail }).catch((err) =>
      logger.error("sendSuperAdminInviteEmail failed", { email: admin.email, err }),
    );

    return { admin };
  }

  async removeAdmin(id: string, currentAdminSub: string) {
    // Removing your own access mid-session leaves you signed in with a valid
    // token but no row to sign back in with — an easy way to lock the whole
    // team out of the console by accident.
    if (id === currentAdminSub) {
      throw new BadRequestException({
        error: "You can't remove your own access. Ask another admin to do it.",
        code: "self_removal",
      });
    }

    const total = await this.prisma.superAdmin.count();
    if (total <= 1) {
      throw new BadRequestException({ error: "You can't remove the last administrator.", code: "last_admin" });
    }

    const admin = await this.prisma.superAdmin.findUnique({ where: { id }, select: { id: true } });
    if (!admin) {
      throw new NotFoundException({ error: "Administrator not found", code: "not_found" });
    }

    // A hard delete is right here, unlike everywhere else in this codebase:
    // the row *is* the grant, so soft-deleting it would leave access intact.
    await this.prisma.superAdmin.delete({ where: { id } });
    return { ok: true };
  }

  // --- Vendors ---------------------------------------------------------------

  async listVendors(query?: string) {
    const trimmed = query?.trim();
    const vendors = await this.prisma.vendor.findMany({
      where: {
        ...realVendorsFilter,
        ...(trimmed
          ? {
              OR: [
                { name: { contains: trimmed, mode: "insensitive" as const } },
                { slug: { contains: trimmed, mode: "insensitive" as const } },
                { location: { contains: trimmed, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true, name: true, slug: true, location: true, suspended: true,
        storefrontPublished: true, verificationStatus: true,
        _count: { select: { bookings: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { vendors };
  }

  async getVendorDetail(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        staff: { where: { active: true }, orderBy: { role: "asc" } },
        verificationRequest: { select: { id: true, status: true, legalName: true } },
        _count: { select: { bookings: true, orders: true, services: true, products: true } },
      },
    });
    if (!vendor) throw new NotFoundException({ error: "Vendor not found", code: "not_found" });

    const completedOrders = await this.prisma.order.aggregate({
      where: { vendorId: vendor.id, status: "completed" },
      _sum: { totalPesewas: true },
    });

    return { vendor, completedValuePesewas: completedOrders._sum.totalPesewas ?? 0 };
  }

  async applyVendorAction(id: string, dto: VendorActionDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id }, select: { id: true } });
    if (!vendor) throw new NotFoundException({ error: "Vendor not found", code: "not_found" });

    switch (dto.action) {
      case "suspend":
        await this.prisma.vendor.update({
          where: { id },
          data: { suspended: true, suspendedAt: new Date(), suspendedReason: dto.reason },
        });
        return { ok: true };

      case "unsuspend":
        await this.prisma.vendor.update({
          where: { id },
          data: { suspended: false, suspendedAt: null, suspendedReason: null },
        });
        return { ok: true };

      // Direct verify/unverify, for a vendor whose identity was confirmed
      // outside the application flow. Goes through the same cascade helpers
      // as an approval, so the person and all their shops stay in step.
      case "verify": {
        const owner = await findVendorOwner(id);
        if (!owner) throw new ConflictException({ error: "This vendor has no active owner.", code: "no_owner" });
        const cascade = await verifyPerson(owner.id);
        return { ok: true, verifiedVendors: cascade.vendorNames };
      }

      case "unverify": {
        const owner = await findVendorOwner(id);
        if (!owner) throw new ConflictException({ error: "This vendor has no active owner.", code: "no_owner" });
        const cascade = await unverifyPerson(owner.id);
        return { ok: true, unverifiedVendors: cascade.vendorNames };
      }
    }
  }

  // --- Verifications -----------------------------------------------------

  async listVerifications() {
    // Explicit select, not a bare findMany — a default Prisma select returns
    // every scalar column, which would ship idPhotoKey/selfiePhotoKey (a
    // private R2 object key) to the browser in a real HTTP response, unlike
    // the original Next.js page which just held these rows in server memory.
    const applications = await this.prisma.verificationRequest.findMany({
      select: {
        id: true, legalName: true, status: true, submittedAt: true,
        vendor: { select: { name: true, slug: true } },
      },
      // Pending first, then most recent — a reviewer opening this wants the
      // queue, not a chronological log.
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    });
    return {
      applications: applications.map((a) => ({ ...a, vendorStatus: REQUEST_TO_VENDOR_STATUS[a.status] })),
    };
  }

  async getVerificationDetail(id: string) {
    const application = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { vendor: { select: { id: true, name: true, slug: true, verificationStatus: true } } },
    });
    if (!application) throw new NotFoundException({ error: "Application not found", code: "not_found" });

    const owner = await findVendorOwner(application.vendorId);

    // Neither storage key travels in this response — unlike the original
    // Next.js page, which held this row in server memory and never
    // serialized it to a client, this is now a real HTTP JSON response, so
    // idPhotoKey/selfiePhotoKey would otherwise ship a private R2 object key
    // to the browser. hasSelfiePhoto is all the client needs to decide
    // whether to render a second <img>; the ID photo is always present
    // (mandatory at submission) so no equivalent boolean is needed for it.
    const { idPhotoKey: _idPhotoKey, selfiePhotoKey: _selfiePhotoKey, ...safeApplication } = application;
    return {
      application: {
        ...safeApplication,
        vendorStatus: REQUEST_TO_VENDOR_STATUS[application.status],
        hasSelfiePhoto: Boolean(application.selfiePhotoKey),
      },
      ownerEmail: owner?.email ?? null,
    };
  }

  async reviewVerification(id: string, dto: ReviewVerificationDto, reviewerSub: string) {
    const application = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { vendor: { select: { id: true, name: true } } },
    });
    if (!application) throw new NotFoundException({ error: "Application not found", code: "not_found" });

    // Guards against two admins opening the same application and both acting.
    if (application.status !== "PENDING") {
      throw new ConflictException({ error: "This application has already been reviewed.", code: "already_reviewed" });
    }

    const owner = await findVendorOwner(application.vendorId);
    const now = new Date();

    if (dto.action === "approve") {
      if (!owner) {
        throw new ConflictException({ error: "This vendor has no active owner to verify.", code: "no_owner" });
      }

      await this.prisma.verificationRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          rejectionReason: null,
          // Taken from the session, never from the request body.
          reviewedBySuperAdminId: reviewerSub,
          reviewedAt: now,
        },
      });

      const cascade = await verifyPerson(owner.id);

      sendVerificationApprovedEmail({
        to: owner.email,
        legalName: application.legalName,
        vendorNames: cascade.vendorNames,
      }).catch((err) => logger.error("sendVerificationApprovedEmail failed", { applicationId: id, err }));

      return { ok: true, status: "APPROVED" as const, verifiedVendors: cascade.vendorNames };
    }

    await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: dto.reason, reviewedBySuperAdminId: reviewerSub, reviewedAt: now },
      }),
      this.prisma.vendor.update({ where: { id: application.vendorId }, data: { verificationStatus: "REJECTED" } }),
    ]);

    if (owner) {
      sendVerificationRejectedEmail({ to: owner.email, legalName: application.legalName, reason: dto.reason }).catch(
        (err) => logger.error("sendVerificationRejectedEmail failed", { applicationId: id, err }),
      );
    }

    return { ok: true, status: "REJECTED" as const };
  }

  // Reviewers see identity documents through this only: bytes proxied
  // server-side, never a redirect or signed URL — lib/private-storage.ts
  // has no publicUrl() to produce one with.
  async getVerificationPhoto(id: string, kind: "id" | "selfie"): Promise<{ buffer: Buffer; contentType: string }> {
    const application = await this.prisma.verificationRequest.findUnique({
      where: { id },
      select: { idPhotoKey: true, selfiePhotoKey: true },
    });
    if (!application) throw new NotFoundException({ error: "Application not found", code: "not_found" });

    const key = kind === "id" ? application.idPhotoKey : application.selfiePhotoKey;
    if (!key) throw new NotFoundException({ error: "No photo of that kind was submitted", code: "not_found" });

    try {
      return await getPrivateStorage().getObject(key);
    } catch (err) {
      logger.error("verification photo read failed", { applicationId: id, kind, err });
      throw new BadRequestException({ error: "Couldn't load that document", code: "server_error" });
    }
  }
}
