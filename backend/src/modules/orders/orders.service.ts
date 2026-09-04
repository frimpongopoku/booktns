import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { normalizePhone } from "../../common/lib/phone";
import { generateOrderSlug, generateOrderRef } from "../../common/lib/slugs";
import { serializeOrder } from "../../common/lib/serialize";
import { generateOrderConfirmationPdf } from "../../common/lib/pdf";
import { uploadFile } from "../../common/lib/storage";
import { logger } from "../../common/lib/logger";
import type { CreateOrderDto, UpdateOrderDto } from "./orders.schemas";

const MAX_REF_ATTEMPTS = 5;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Public, unauthenticated — guest checkout. Every write is scoped/verified
  // against the vendor resolved from vendorSlug rather than gated by role.
  async create(dto: CreateOrderDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { slug: dto.vendorSlug },
      select: { id: true, active: true, storefrontPublished: true },
    });
    if (!vendor || !vendor.active || !vendor.storefrontPublished) {
      throw new NotFoundException({ error: "Shop not found", code: "not_found" });
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, vendorId: vendor.id, active: true } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException({ error: "One or more items in your cart are no longer available", code: "invalid_request" });
      }
      if (item.quantity > product.stockCount) {
        throw new BadRequestException({ error: `Only ${product.stockCount} of "${product.name}" left in stock`, code: "invalid_request" });
      }
    }

    if (dto.paymentMethodId) {
      const paymentMethod = await this.prisma.paymentMethod.findFirst({ where: { id: dto.paymentMethodId, vendorId: vendor.id, active: true }, select: { id: true } });
      if (!paymentMethod) throw new BadRequestException({ error: "Payment method not found", code: "not_found" });
    }

    const normalizedPhone = normalizePhone(dto.customerPhone);
    if (!normalizedPhone) throw new BadRequestException({ error: "Enter a valid phone number", code: "invalid_request" });

    const totalPesewas = dto.items.reduce((sum, item) => sum + productMap.get(item.productId)!.priceInPesewas * item.quantity, 0);
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      return { productId: product.id, name: product.name, priceSnapshot: product.priceInPesewas, quantity: item.quantity };
    });

    for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt++) {
      try {
        const order = await this.prisma.order.create({
          data: {
            vendorId: vendor.id,
            slug: generateOrderSlug(),
            ref: generateOrderRef(),
            customerName: dto.customerName,
            customerPhone: normalizedPhone,
            notes: dto.notes ?? "",
            deliveryPreference: dto.deliveryPreference,
            paymentMethodId: dto.paymentMethodId || null,
            totalPesewas,
            items: { create: orderItems },
          },
          include: { items: true, paymentMethod: true },
        });
        return { order: serializeOrder(order) };
      } catch (err) {
        const isRefConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (isRefConflict && attempt < MAX_REF_ATTEMPTS - 1) continue;
        throw err;
      }
    }
    throw new InternalServerErrorException({ error: "Something went wrong. Please try again.", code: "server_error" });
  }

  // Dashboard order list — vendor-scoped, staff-authenticated. First view
  // of a new order marks it seen (CLAUDE.md data rules).
  async list(vendorId: string) {
    await this.prisma.order.updateMany({ where: { vendorId, seenByVendorAt: null }, data: { seenByVendorAt: new Date() } });
    const orders = await this.prisma.order.findMany({ where: { vendorId }, include: { items: true, paymentMethod: true }, orderBy: { createdAt: "desc" } });
    return { orders: orders.map(serializeOrder) };
  }

  async updateStatus(vendorId: string, id: string, dto: UpdateOrderDto) {
    const existing = await this.prisma.order.findFirst({ where: { id, vendorId }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: "Order not found", code: "not_found" });

    const order = await this.prisma.order.update({ where: { id }, data: { status: dto.status }, include: { items: true, paymentMethod: true } });
    return { order: serializeOrder(order) };
  }

  // Public, unauthenticated — a guest's only credential is the unguessable
  // order slug itself, same trust model as the /order/[slug] page.
  //
  // Generated on first request rather than at checkout, then cached: the
  // customer lands on the confirmation page the instant the order row
  // exists, so a background job at checkout time would race the page and
  // the download button would be dead on arrival.
  async getConfirmationPdfUrl(slug: string): Promise<string> {
    const order = await this.prisma.order.findUnique({ where: { slug }, include: { items: true, paymentMethod: true, vendor: true } });
    if (!order) throw new NotFoundException({ error: "Order not found", code: "not_found" });

    if (order.confirmationPdfUrl) return order.confirmationPdfUrl;

    try {
      const pdfBuffer = await generateOrderConfirmationPdf(serializeOrder(order), {
        name: order.vendor.name,
        location: order.vendor.location,
        logoUrl: order.vendor.logoUrl,
        slug: order.vendor.slug,
        phone: order.vendor.phone,
        whatsapp: order.vendor.personalWhatsappNumber ?? order.vendor.whatsapp,
        storefrontTheme: order.vendor.storefrontTheme,
        ownerName: order.vendor.ownerName,
        showOwnerName: order.vendor.showOwnerName,
      });

      const confirmationPdfUrl = await uploadFile(`orders/${order.slug}/confirmation.pdf`, pdfBuffer, "application/pdf");
      await this.prisma.order.update({ where: { id: order.id }, data: { confirmationPdfUrl } });
      return confirmationPdfUrl;
    } catch (err) {
      logger.error("generateOrderConfirmationPdf failed", { orderId: order.id, vendorId: order.vendorId, err });
      throw new InternalServerErrorException({ error: "We couldn't build your receipt just now. Please try again in a moment.", code: "server_error" });
    }
  }
}
