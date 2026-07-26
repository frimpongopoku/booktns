import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeMedia } from "@/lib/serialize";
import { uploadFile } from "@/lib/storage";
import { compressImage } from "@/lib/image";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// 10MB matches the common upload cap used by platforms like Shopify and
// WordPress for raw (pre-compression) image uploads — generous enough for
// an uncompressed modern phone photo, without letting the request body
// balloon. Everything under this gets re-encoded/downsized in compressImage,
// so the actual stored file ends up far smaller regardless.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PAGE_SIZE = 24;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean))];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search")?.trim();

  const where = {
    vendorId: auth.session.vendorId,
    ...(search
      ? {
          OR: [
            { filename: { contains: search, mode: "insensitive" as const } },
            { tags: { has: search.toLowerCase() } },
          ],
        }
      : {}),
  };

  const page = await db.media.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = page.length > PAGE_SIZE;
  const items = page.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ media: items.map(serializeMedia), nextCursor });
}

export async function POST(request: Request) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data", code: "invalid_request" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided", code: "invalid_request" }, { status: 400 });
  }

  const tags = parseTags(formData.get("tags"));

  for (const file of files) {
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `${file.name} isn't a supported image type (JPEG, PNG, WebP, GIF only)`, code: "invalid_file_type" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} is larger than 10MB`, code: "file_too_large" },
        { status: 400 }
      );
    }
  }

  let created: Awaited<ReturnType<typeof db.media.create>>[];
  try {
    created = await Promise.all(
      files.map(async (file) => {
        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const { buffer, contentType, filename } = await compressImage(rawBuffer, file.type, file.name);
        const key = `${auth.session.vendorId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFilename(filename)}`;
        const url = await uploadFile(key, buffer, contentType);

        return db.media.create({
          data: {
            vendorId: auth.session.vendorId,
            url,
            filename,
            contentType,
            sizeBytes: buffer.length,
            tags,
          },
        });
      })
    );
  } catch {
    return NextResponse.json(
      { error: "One of those files couldn't be processed as an image", code: "invalid_image" },
      { status: 400 }
    );
  }

  return NextResponse.json({ media: created.map(serializeMedia) }, { status: 201 });
}
