import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { serializeService, serializeProduct } from "../../common/lib/serialize";
import { slugifyProductName, dedupeSlug } from "../../common/lib/slugs";
import type {
  CreateServiceDto, UpdateServiceDto, CreateProductDto, UpdateProductDto,
} from "./catalog.schemas";

const PAGE_SIZE = 24; // matches the media gallery's page size

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Services --------------------------------------------------------

  async listServices(vendorId: string) {
    const services = await this.prisma.service.findMany({
      where: { vendorId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return { services: services.map(serializeService) };
  }

  async createService(vendorId: string, dto: CreateServiceDto) {
    const highestOrder = await this.prisma.service.aggregate({
      where: { vendorId },
      _max: { displayOrder: true },
    });
    const service = await this.prisma.service.create({
      data: {
        vendorId,
        name: dto.name,
        category: dto.category,
        durationMinutes: dto.durationMinutes,
        priceInPesewas: dto.priceInPesewas,
        description: dto.description,
        featured: dto.featured ?? false,
        displayOrder: (highestOrder._max.displayOrder ?? -1) + 1,
      },
    });
    return { service: serializeService(service) };
  }

  async updateService(vendorId: string, id: string, dto: UpdateServiceDto) {
    await this.assertServiceOwned(vendorId, id);
    const service = await this.prisma.service.update({ where: { id }, data: dto });
    return { service: serializeService(service) };
  }

  // Soft delete only, per CLAUDE.md data rules — never hard delete.
  async archiveService(vendorId: string, id: string) {
    await this.assertServiceOwned(vendorId, id);
    const service = await this.prisma.service.update({ where: { id }, data: { active: false } });
    return { service: serializeService(service) };
  }

  private async assertServiceOwned(vendorId: string, id: string): Promise<void> {
    const existing = await this.prisma.service.findFirst({ where: { id, vendorId }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: "Service not found", code: "not_found" });
  }

  // --- Products ----------------------------------------------------------

  async listProducts(
    vendorId: string,
    cursor: string | undefined,
    search: string | undefined,
    status: "active" | "archived" = "active",
  ) {
    const where = {
      vendorId,
      active: status === "archived" ? false : true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const page = await this.prisma.product.findMany({
      where,
      include: { images: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = page.length > PAGE_SIZE;
    const items = page.slice(0, PAGE_SIZE);
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { products: items.map(serializeProduct), nextCursor };
  }

  async createProduct(vendorId: string, dto: CreateProductDto) {
    const existingSlugs = await this.prisma.product.findMany({ where: { vendorId }, select: { slug: true } });
    const slug = dedupeSlug(slugifyProductName(dto.name), new Set(existingSlugs.map((p) => p.slug)));

    const product = await this.prisma.product.create({
      data: {
        vendorId,
        name: dto.name,
        slug,
        priceInPesewas: dto.priceInPesewas,
        stockCount: dto.stockCount,
        lowStockThreshold: dto.lowStockThreshold,
        description: dto.description,
        featured: dto.featured ?? false,
        images: { create: (dto.images ?? []).map((url, displayOrder) => ({ url, displayOrder })) },
      },
      include: { images: true },
    });
    return { product: serializeProduct(product) };
  }

  async updateProduct(vendorId: string, id: string, dto: UpdateProductDto) {
    await this.assertProductOwned(vendorId, id);
    const { images, ...fields } = dto;

    const product = await this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...fields,
          ...(images ? { images: { create: images.map((url, displayOrder) => ({ url, displayOrder })) } } : {}),
        },
        include: { images: true },
      });
    });
    return { product: serializeProduct(product) };
  }

  // Soft delete only, per CLAUDE.md data rules — never hard delete.
  async archiveProduct(vendorId: string, id: string) {
    await this.assertProductOwned(vendorId, id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { active: false },
      include: { images: true },
    });
    return { product: serializeProduct(product) };
  }

  // A slim scalar-only projection so the dashboard's low-stock warning
  // banner can scan the vendor's whole catalog — not just whichever
  // paginated page happens to be loaded — without the cost of fetching every
  // product's full record.
  async lowStockProductNames(vendorId: string) {
    const products = await this.prisma.product.findMany({
      where: { vendorId, active: true },
      select: { name: true, stockCount: true, lowStockThreshold: true },
    });
    return { names: products.filter((p) => p.stockCount > 0 && p.stockCount <= p.lowStockThreshold).map((p) => p.name) };
  }

  private async assertProductOwned(vendorId: string, id: string): Promise<void> {
    const existing = await this.prisma.product.findFirst({ where: { id, vendorId }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: "Product not found", code: "not_found" });
  }
}
