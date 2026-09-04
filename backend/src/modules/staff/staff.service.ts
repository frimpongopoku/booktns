import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { serializeStaff } from "../../common/lib/serialize";
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
    try {
      const staff = await this.prisma.staff.create({
        data: {
          vendorId,
          name: dto.name,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          role: dto.role,
          roleDetail: dto.roleDetail,
          botAccess: dto.botAccess ?? false,
          serviceCategories: dto.serviceCategories ?? [],
        },
      });
      return { staff: serializeStaff(staff) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException(DUPLICATE_EMAIL_ERROR);
      }
      throw err;
    }
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
