import { z } from "zod";

export const updateMediaSchema = z.object({
  tags: z.array(z.string().trim().toLowerCase().min(1)).max(20, "Up to 20 tags per file"),
});
export type UpdateMediaDto = z.infer<typeof updateMediaSchema>;

export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// 10MB matches the common upload cap used by platforms like Shopify and
// WordPress for raw (pre-compression) image uploads.
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
