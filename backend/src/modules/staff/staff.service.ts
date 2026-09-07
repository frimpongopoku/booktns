import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { serializeStaff } from "../../common/lib/serialize";
import { sendStaffInviteEmail } from "../../common/lib/email";
import { logger } from "../../common/lib/logger";
import type { CreateStaffDto, UpdateStaffDto } from "./staff.schemas";

const DUPLICATE_EMAIL_ERROR = { error: "That email is already registered to another staff account.", code: "duplicate_email" };

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async list(vendorId: string) {
    const staff = await this.prisma.staff.findMany({ where: { vendorId }, orderBy: { createdAt: "asc" } });
    return { staff: staff.map(serializeStaff) };
  }

  async create(vendorId: string, dto: CreateStaffDto) {
    let staff;
    try {
      staff = await this.prisma.staff.create({
        data: {
          vendorId,
          name: dto.name,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          role: dto.role,
          roleDetail: dto.roleDetail,
          botAccess: dto.botAccess ?? false,
          serviceCategories: dto.serviceCategories ?? [],
          bookable: dto.bookable ?? true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException(DUPLICATE_EMAIL_ERROR);
      }
      throw err;
    }

    // Fire-and-forget, same pattern as every other account-provisioning
    // email (sendVendorWelcomeEmail, sendSuperAdminInviteEmail) — the staff
    // row already exists regardless of whether this send succeeds, and a
    // flaky Resend call must never fail a request that already worked.
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { name: true } });
    if (vendor) {
      sendStaffInviteEmail({ to: staff.email, staffName: staff.name, vendorName: vendor.name, role: staff.role }).catch((err) =>
        logger.error("sendStaffInviteEmail failed", { staffId: staff.id, vendorId, err }),
      );
    }

    return { staff: serializeStaff(staff) };
  }

  async update(vendorId: string, id: string, dto: UpdateStaffDto) {
    await this.assertOwned(vendorId, id);
    try {
      const staff = await this.prisma.staff.update({
        where: { id },
        data: { ...dto, email: dto.email?.toLowerCase() },
      });
      return { staff: serializeStaff(staff) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException(DUPLICATE_EMAIL_ERROR);
      }
      throw err;
    }
  }

  // Soft delete only — deactivate rather than remove the record.
  async archive(vendorId: string, id: string) {
    await this.assertOwned(vendorId, id);
    const staff = await this.prisma.staff.update({ where: { id }, data: { active: false } });
    return { staff: serializeStaff(staff) };
  }

  private async assertOwned(vendorId: string, id: string): Promise<void> {
    const existing = await this.prisma.staff.findFirst({ where: { id, vendorId }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: "Staff member not found", code: "not_found" });
  }
}
