import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

// Keeps Zod as the validation layer rather than swapping to class-validator.
// The schemas are being moved across from the Next.js routes verbatim, and
// re-expressing three dozen of them as decorated classes would be a second
// migration hiding inside this one — with its own chance of quietly changing
// what the API accepts.
//
// Surfaces the first issue's message, exactly as the route handlers did, so
// inline form errors in the UI read the same as before.
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        error: parsed.error.issues[0]?.message ?? "Invalid request",
        code: "invalid_request",
      });
    }
    return parsed.data;
  }
}
