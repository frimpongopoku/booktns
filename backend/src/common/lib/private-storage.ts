import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "../lib/storage";
import { logger } from "../lib/logger";

// Storage for identity documents — Ghana Card scans and selfies submitted for
// vendor verification.
//
// Note what this interface does NOT have: there is deliberately no
// `publicUrl()` here, unlike lib/storage.ts. These objects are never given a
// public or semi-public link. The only way the bytes come back out is
// getObject(), called server-side from behind the superadmin session guard.
// Omitting the method is the enforcement mechanism — no code anywhere can
// produce a link to these bytes, because the method does not exist. That is a
// type error, not a convention someone has to remember.
export interface PrivateStorage {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<{ buffer: Buffer; contentType: string }>;
  deleteObject(key: string): Promise<void>;
}

export const PRIVATE_BUCKET = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET ?? "";

export function isPrivateStorageConfigured(): boolean {
  return Boolean(PRIVATE_BUCKET);
}

// A separate bucket on the same R2 account — no public access, no custom
// domain attached. Keeping identity documents out of the media bucket means a
// misconfiguration of the public bucket can never expose them.
const r2PrivateStorage: PrivateStorage = {
  async putObject(key, body, contentType) {
    await r2Client.send(
      new PutObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key, Body: body, ContentType: contentType })
    );
  },

  async getObject(key) {
    const res = await r2Client.send(new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }));
    if (!res.Body) throw new Error(`Object not found: ${key}`);
    const buffer = Buffer.from(await res.Body.transformToByteArray());
    return { buffer, contentType: res.ContentType ?? "application/octet-stream" };
  },

  async deleteObject(key) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }));
  },
};

// Development fallback. Writes under .private-uploads/, which is gitignored.
const LOCAL_ROOT = path.join(process.cwd(), ".private-uploads");

function localPathFor(key: string): string {
  // Key segments are generated server-side from ids, never from user input,
  // but normalising here means a future caller can't walk out of the root.
  const safe = key.split("/").map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/");
  return path.join(LOCAL_ROOT, safe);
}

const localPrivateStorage: PrivateStorage = {
  async putObject(key, body) {
    const target = localPathFor(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  },

  async getObject(key) {
    const buffer = await readFile(localPathFor(key));
    // Everything written here is normalised to WebP before storage.
    return { buffer, contentType: "image/webp" };
  },

  async deleteObject(key) {
    await unlink(localPathFor(key)).catch(() => {});
  },
};

let warned = false;

export function getPrivateStorage(): PrivateStorage {
  if (isPrivateStorageConfigured()) return r2PrivateStorage;

  // Loud, once per process — running this in production would put customers'
  // government ID scans on an ephemeral local disk.
  if (!warned) {
    warned = true;
    logger.warn(
      "CLOUDFLARE_R2_PRIVATE_BUCKET is not set — identity documents are being written to local disk. " +
        "This is fine for development and MUST NOT run in production."
    );
  }
  return localPrivateStorage;
}
