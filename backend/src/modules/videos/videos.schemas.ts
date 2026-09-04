import { z } from "zod";

export const createVideoSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  url: z.string().trim().url("Enter a valid video link"),
  durationSeconds: z.number().int().positive().optional(),
});
export type CreateVideoDto = z.infer<typeof createVideoSchema>;

export const updateVideoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  description: z.string().trim().optional(),
  url: z.string().trim().url("Enter a valid video link").optional(),
  durationSeconds: z.number().int().positive().optional(),
});
export type UpdateVideoDto = z.infer<typeof updateVideoSchema>;
