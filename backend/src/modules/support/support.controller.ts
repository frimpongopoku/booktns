import { Body, Controller, NotFoundException, Post } from "@nestjs/common";
import { z } from "zod";
import { CurrentSession, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import { PrismaService } from "../../common/prisma/prisma.service";
import { sendSupportMessageNotification } from "../../common/lib/email";
import { logger } from "../../common/lib/logger";
import type { SessionPayload } from "../../common/session.types";

const createSupportSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});
type CreateSupportDto = z.infer<typeof createSupportSchema>;

// Any authenticated staff member can reach the Booktns platform team — this
// isn't an ops permission, just "someone at this vendor needs help".
@Roles("Owner", "Management", "Service")
@Controller("support")
export class SupportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createSupportSchema)) dto: CreateSupportDto,
    @CurrentSession() session: SessionPayload,
  ) {
    const staff = await this.prisma.staff.findUnique({ where: { id: session.staffId }, select: { name: true, email: true } });
    if (!staff) throw new NotFoundException({ error: "Staff not found", code: "not_found" });

    const supportMessage = await this.prisma.supportMessage.create({
      data: { vendorId: session.vendorId, staffId: session.staffId, subject: dto.subject, message: dto.message },
    });

    // No after()-style deferral needed: this is a long-lived Nest process,
    // not a serverless function that can be frozen the instant a response
    // returns. Still fire-and-forget with its own .catch — a slow mail
    // provider must not fail an otherwise-successful support request.
    sendSupportMessageNotification({
      vendorName: session.vendorName,
      staffName: staff.name,
      staffEmail: staff.email,
      subject: dto.subject,
      message: dto.message,
    }).catch((err) =>
      logger.error("sendSupportMessageNotification failed", { supportMessageId: supportMessage.id, vendorId: session.vendorId, err }),
    );

    return { supportMessage };
  }
}
