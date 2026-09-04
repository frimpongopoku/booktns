import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { serializeVendor } from "../../common/lib/serialize";
import { normalizePhone } from "../../common/lib/phone";
import { getDomainProvider } from "../../common/lib/domains/factory";
import type { UpdateVendorDto, UpdateHoursDto } from "./vendor.schemas";

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async get(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException({ error: "Vendor not found", code: "not_found" });
    return { vendor: serializeVendor(vendor) };
  }

  async update(vendorId: string, dto: UpdateVendorDto) {
    if (dto.heroVideoId) {
      const heroVideo = await this.prisma.vendorVideo.findFirst({ where: { id: dto.heroVideoId, vendorId }, select: { id: true } });
      if (!heroVideo) throw new BadRequestException({ error: "Video not found", code: "not_found" });
    }

    // Phone numbers are always stored E.164 (CLAUDE.md § Data Rules). An
    // empty string clears the field; anything unparseable is a 400 rather
    // than a silently mangled number.
    const data: Record<string, unknown> = { ...dto };
    if (dto.ownerPhone !== undefined) {
      if (!dto.ownerPhone) {
        data.ownerPhone = null;
      } else {
        const normalized = normalizePhone(dto.ownerPhone);
        if (!normalized) throw new BadRequestException({ error: "Enter a valid phone number", code: "invalid_request" });
        data.ownerPhone = normalized;
      }
    }

    const vendor = await this.prisma.vendor.update({ where: { id: vendorId }, data });
    return { vendor: serializeVendor(vendor) };
  }

  async getHours(vendorId: string) {
    const days = await this.prisma.businessHours.findMany({ where: { vendorId }, orderBy: { dayOfWeek: "asc" } });
    return { days };
  }

  async updateHours(vendorId: string, dto: UpdateHoursDto) {
    const days = await this.prisma.$transaction(
      dto.days.map((day) =>
        this.prisma.businessHours.upsert({
          where: { vendorId_dayOfWeek: { vendorId, dayOfWeek: day.dayOfWeek } },
          create: { vendorId, dayOfWeek: day.dayOfWeek, isClosed: day.isClosed, openTime: day.isClosed ? null : day.openTime, closeTime: day.isClosed ? null : day.closeTime },
          update: { isClosed: day.isClosed, openTime: day.isClosed ? null : day.openTime, closeTime: day.isClosed ? null : day.closeTime },
        }),
      ),
    );
    return { days };
  }

  // Live re-check every call — the DB's customDomainVerified flag is only a
  // cache that the proxy trusts for fast routing; this settings-facing
  // endpoint always asks the provider for real-time DNS state.
  async getDomain(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { customDomain: true, customDomainVerified: true } });
    if (!vendor) throw new NotFoundException({ error: "Vendor not found", code: "not_found" });
    if (!vendor.customDomain) return { domain: null, verified: false, instructions: [] };

    const provider = getDomainProvider();
    const status = await provider.getStatus(vendor.customDomain);
    if (status.verified !== vendor.customDomainVerified) {
      await this.prisma.vendor.update({ where: { id: vendorId }, data: { customDomainVerified: status.verified } });
    }
    return { domain: vendor.customDomain, verified: status.verified, instructions: status.instructions };
  }

  async addDomain(vendorId: string, domain: string) {
    const provider = getDomainProvider();
    try {
      await provider.addDomain(domain);
    } catch (err) {
      throw new BadGatewayException({ error: err instanceof Error ? err.message : "Could not add domain", code: "provider_error" });
    }

    try {
      await this.prisma.vendor.update({ where: { id: vendorId }, data: { customDomain: domain, customDomainVerified: false } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException({ error: "This domain is already connected to another storefront", code: "domain_taken" });
      }
      throw err;
    }

    const status = await provider.getStatus(domain);
    return { domain, verified: status.verified, instructions: status.instructions };
  }

  async removeDomain(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { customDomain: true } });
    if (vendor?.customDomain) {
      const provider = getDomainProvider();
      await provider.removeDomain(vendor.customDomain).catch(() => undefined);
    }
    await this.prisma.vendor.update({ where: { id: vendorId }, data: { customDomain: null, customDomainVerified: false } });
    return { ok: true };
  }

  async checkSlug(slug: string) {
    const existing = await this.prisma.vendor.findUnique({ where: { slug }, select: { id: true } });
    return { available: !existing };
  }

  // Everything the dashboard shell (Sidebar, MobileNav, the suspension
  // banner) needs on every single page load, in one call. Unlike GET
  // /vendor (Owner-only — full settings), this is open to any authenticated
  // role: a Service stylist still needs to see the storefront link and the
  // suspension notice. Badge counts are read fresh on every call rather than
  // cached, since they change on every new booking/order.
  async dashboardContext(vendorId: string) {
    const [vendor, bookingBadgeCount, orderBadgeCount] = await Promise.all([
      this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { slug: true, name: true, location: true, storefrontPublished: true, customDomain: true, customDomainVerified: true, suspended: true, suspendedReason: true, showVideoSection: true, videoSectionTitle: true, videoSectionSubtitle: true },
      }),
      this.prisma.booking.count({ where: { vendorId, seenByVendorAt: null } }),
      this.prisma.order.count({ where: { vendorId, seenByVendorAt: null } }),
    ]);
    if (!vendor) throw new NotFoundException({ error: "Vendor not found", code: "not_found" });
    return { vendor, bookingBadgeCount, orderBadgeCount };
  }
}
