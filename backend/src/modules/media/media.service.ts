import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { serializeMedia } from "../../common/lib/serialize";
import { uploadFile, deleteFile, keyFromPublicUrl } from "../../common/lib/storage";
import { compressImage } from "../../common/lib/image";
import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE_BYTES } from "./media.schemas";
import type { UpdateMediaDto } from "./media.schemas";

const PAGE_SIZE = 24;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function parseTags(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean))];
  } catch {
    return [];
  }
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(vendorId: string, cursor: string | undefined, search: string | undefined) {
    const where = {
      vendorId,
      ...(search
        ? { OR: [{ filename: { contains: search, mode: "insensitive" as const } }, { tags: { has: search.toLowerCase() } }] }
        : {}),
    };
    const page = await this.prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = page.length > PAGE_SIZE;
    const items = page.slice(0, PAGE_SIZE);
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return { media: items.map(serializeMedia), nextCursor };
  }

  async upload(vendorId: string, files: Express.Multer.File[], tags: string[]) {
    if (files.length === 0) {
      throw new BadRequestException({ error: "No files provided", code: "invalid_request" });
    }
    for (const file of files) {
      if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
        throw new BadRequestException({
          error: `${file.originalname} isn't a supported image type (JPEG, PNG, WebP, GIF only)`,
          code: "invalid_file_type",
        });
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException({ error: `${file.originalname} is larger than 10MB`, code: "file_too_large" });
      }
    }

    let created;
    try {
      created = await Promise.all(
        files.map(async (file) => {
          const { buffer, contentType, filename } = await compressImage(file.buffer, file.mimetype, file.originalname);
          const key = `${vendorId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFilename(filename)}`;
          const url = await uploadFile(key, buffer, contentType);
          return this.prisma.media.create({
            data: { vendorId, url, filename, contentType, sizeBytes: buffer.length, tags },
          });
        }),
      );
    } catch {
      throw new BadRequestException({ error: "One of those files couldn't be processed as an image", code: "invalid_image" });
    }

    return { media: created.map(serializeMedia) };
  }

  async update(vendorId: string, id: string, dto: UpdateMediaDto) {
    await this.assertOwned(vendorId, id);
    const media = await this.prisma.media.update({ where: { id }, data: { tags: [...new Set(dto.tags)] } });
    return { media: serializeMedia(media) };
  }

  async remove(vendorId: string, id: string) {
    const existing = await this.prisma.media.findFirst({ where: { id, vendorId } });
    if (!existing) throw new NotFoundException({ error: "File not found", code: "not_found" });

    const key = keyFromPublicUrl(existing.url);
    if (key) await deleteFile(key);
    await this.prisma.media.delete({ where: { id } });
    return { ok: true };
  }

  private async assertOwned(vendorId: string, id: string): Promise<void> {
    const existing = await this.prisma.media.findFirst({ where: { id, vendorId }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: "File not found", code: "not_found" });
  }
}
