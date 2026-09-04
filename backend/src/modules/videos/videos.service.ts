import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { serializeVendorVideo } from "../../common/lib/serialize";
import { resolveVideoThumbnail } from "../../common/lib/oembed";
import type { CreateVideoDto, UpdateVideoDto } from "./videos.schemas";

const GRADIENT_PALETTE: [string, string][] = [
  ["var(--brand-accent-light)", "var(--brand-accent-light-2)"],
  ["#18181B", "var(--brand-accent-light)"],
  ["var(--brand-accent-light-2)", "var(--brand-accent-dark-2)"],
  ["color-mix(in srgb, var(--brand-accent-dark) 55%, black)", "var(--brand-accent-light)"],
  ["#0F172A", "var(--brand-accent-light-2)"],
];

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(vendorId: string) {
    const videos = await this.prisma.vendorVideo.findMany({ where: { vendorId }, orderBy: { displayOrder: "asc" } });
    return { videos: videos.map(serializeVendorVideo) };
  }

  async create(vendorId: string, dto: CreateVideoDto) {
    const highestOrder = await this.prisma.vendorVideo.aggregate({ where: { vendorId }, _max: { displayOrder: true } });
    const nextOrder = (highestOrder._max.displayOrder ?? -1) + 1;
    const [gradientFrom, gradientTo] = GRADIENT_PALETTE[nextOrder % GRADIENT_PALETTE.length];
    const thumbnailUrl = await resolveVideoThumbnail(dto.url);

    const video = await this.prisma.vendorVideo.create({
      data: {
        vendorId,
        title: dto.title,
        description: dto.description,
        url: dto.url,
        durationSeconds: dto.durationSeconds,
        gradientFrom,
        gradientTo,
        thumbnailUrl,
        displayOrder: nextOrder,
      },
    });
    return { video: serializeVendorVideo(video) };
  }

  async update(vendorId: string, id: string, dto: UpdateVideoDto) {
    await this.assertOwned(vendorId, id);
    const thumbnailUrl = dto.url ? await resolveVideoThumbnail(dto.url) : undefined;
    const video = await this.prisma.vendorVideo.update({
      where: { id },
      data: { ...dto, ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}) },
    });
    return { video: serializeVendorVideo(video) };
  }

  async remove(vendorId: string, id: string) {
    await this.assertOwned(vendorId, id);
    await this.prisma.$transaction([
      this.prisma.vendor.updateMany({ where: { id: vendorId, heroVideoId: id }, data: { heroVideoId: null } }),
      this.prisma.vendorVideo.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  private async assertOwned(vendorId: string, id: string): Promise<void> {
    const existing = await this.prisma.vendorVideo.findFirst({ where: { id, vendorId }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: "Video not found", code: "not_found" });
  }
}
