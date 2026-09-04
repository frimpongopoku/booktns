import { BadRequestException, Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { z } from "zod";
import { Public } from "../../common/decorators";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getAvailableSlots } from "../../common/lib/availability";

const querySchema = z.object({
  vendorSlug: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  durationMinutes: z.coerce.number().int().positive(),
  staffId: z.string().trim().optional(),
  excludeBookingId: z.string().trim().optional(),
});

// Public — the customer booking wizard has no session. The dashboard's
// reschedule picker (authenticated elsewhere) also calls this same
// unauthenticated endpoint.
@Public()
@Controller("availability")
export class AvailabilityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(
    @Query("vendorSlug") vendorSlug?: string,
    @Query("date") date?: string,
    @Query("durationMinutes") durationMinutes?: string,
    @Query("staffId") staffId?: string,
    @Query("excludeBookingId") excludeBookingId?: string,
  ) {
    const parsed = querySchema.safeParse({ vendorSlug, date, durationMinutes, staffId, excludeBookingId });
    if (!parsed.success) {
      throw new BadRequestException({ error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" });
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { slug: parsed.data.vendorSlug },
      select: { id: true, active: true, storefrontPublished: true },
    });
    if (!vendor || !vendor.active || !vendor.storefrontPublished) {
      throw new NotFoundException({ error: "Shop not found", code: "not_found" });
    }

    // An anonymous caller could otherwise pass an arbitrary booking id to get
    // back availability with that booking's slot artificially freed up.
    // Scope to the resolved vendor and silently ignore it if it doesn't
    // match, rather than trusting it.
    let exclude = parsed.data.excludeBookingId;
    if (exclude) {
      const owned = await this.prisma.booking.findFirst({ where: { id: exclude, vendorId: vendor.id }, select: { id: true } });
      if (!owned) exclude = undefined;
    }

    const slots = await getAvailableSlots({
      vendorId: vendor.id,
      date: parsed.data.date,
      durationMinutes: parsed.data.durationMinutes,
      staffId: parsed.data.staffId,
      excludeBookingId: exclude,
    });
    return { slots };
  }
}
