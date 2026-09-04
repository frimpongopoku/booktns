import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { serializePaymentMethod } from "../../common/lib/serialize";
import type { CreatePaymentMethodDto, UpdatePaymentMethodDto } from "./payments.schemas";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(vendorId: string) {
    const methods = await this.prisma.paymentMethod.findMany({ where: { vendorId }, orderBy: { displayOrder: "asc" } });
    return { paymentMethods: methods.map(serializePaymentMethod) };
  }

  async create(vendorId: string, dto: CreatePaymentMethodDto) {
    const highestOrder = await this.prisma.paymentMethod.aggregate({ where: { vendorId }, _max: { displayOrder: true } });
    const method = await this.prisma.paymentMethod.create({
      data: {
        vendorId,
        type: dto.type,
        label: dto.label,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        network: dto.network,
        displayOrder: (highestOrder._max.displayOrder ?? -1) + 1,
      },
    });
    return { paymentMethod: serializePaymentMethod(method) };
  }

  async update(vendorId: string, id: string, dto: UpdatePaymentMethodDto) {
    await this.assertOwned(vendorId, id);
    const method = await this.prisma.paymentMethod.update({ where: { id }, data: dto });
    return { paymentMethod: serializePaymentMethod(method) };
  }

  // Soft delete only, per CLAUDE.md data rules — never hard delete.
  async archive(vendorId: string, id: string) {
    await this.assertOwned(vendorId, id);
    const method = await this.prisma.paymentMethod.update({ where: { id }, data: { active: false } });
    return { paymentMethod: serializePaymentMethod(method) };
  }

  private async assertOwned(vendorId: string, id: string): Promise<void> {
    const existing = await this.prisma.paymentMethod.findFirst({ where: { id, vendorId }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: "Payment method not found", code: "not_found" });
  }
}
