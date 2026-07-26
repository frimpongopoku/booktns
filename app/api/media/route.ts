import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeMedia } from "@/lib/serialize";
import { uploadFile } from "@/lib/storage";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET() {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const media = await db.media.findMany({
    where: { vendorId: auth.session.vendorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ media: media.map(serializeMedia) });
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

  for (const file of files) {
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `${file.name} isn't a supported image type (JPEG, PNG, WebP, GIF only)`, code: "invalid_file_type" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} is larger than 8MB`, code: "file_too_large" },
        { status: 400 }
      );
    }
  }

  const created = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = `${auth.session.vendorId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFilename(file.name)}`;
      const url = await uploadFile(key, buffer, file.type);

      return db.media.create({
        data: {
          vendorId: auth.session.vendorId,
          url,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        },
      });
    })
  );

  return NextResponse.json({ media: created.map(serializeMedia) }, { status: 201 });
}
