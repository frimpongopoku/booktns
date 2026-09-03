import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Exported so the private-document store (lib/private-storage.ts) and the
// health checks can reuse one configured client — same R2 account and
// credentials, different buckets.
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
  },
});

function publicUrlFor(key: string): string {
  const base = (process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return publicUrlFor(key);
}

export async function deleteFile(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
    })
  );
}

// Derives the R2 object key back out of a public URL produced by uploadFile,
// so deleteFile can be called with only the URL a caller has stored.
export function keyFromPublicUrl(url: string): string | null {
  const base = (process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!base || !url.startsWith(`${base}/`)) return null;
  return url.slice(base.length + 1);
}
