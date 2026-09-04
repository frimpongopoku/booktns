import { Body, Controller, HttpCode, Post, Req, ServiceUnavailableException, HttpException } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { Public } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import { getFeedbackInboxEmail, FEEDBACK_SOURCES } from "../../common/lib/feedback";
import { sendFeedbackNotification } from "../../common/lib/email";
import { logger } from "../../common/lib/logger";

const schema = z.object({
  message: z.string().trim().min(1, "Please tell us what's on your mind").max(5000),
  email: z.string().trim().email("That doesn't look like a valid email").max(320).optional().or(z.literal("")),
  source: z.enum(FEEDBACK_SOURCES),
  path: z.string().trim().max(512).optional(),
});

// Unauthenticated on purpose — the storefront and landing page need it, and
// those visitors have no account by design. That makes it an open relay into
// our own inbox, hence the throttle.
//
// Now a genuinely process-wide limit, which it could not be on serverless:
// one Nest process serves every request, so this Map is actually shared
// rather than existing per-instance. Still in-memory — a restart clears it,
// and a second replica would double the effective limit.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const submissionsByIp = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissionsByIp.get(ip) ?? []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    submissionsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  submissionsByIp.set(ip, recent);

  if (submissionsByIp.size > 5000) {
    for (const [key, times] of submissionsByIp) {
      if (times.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) submissionsByIp.delete(key);
    }
  }
  return false;
}

@Public()
@Controller("feedback")
export class FeedbackController {
  @Post()
  @HttpCode(201)
  async submit(@Body(new ZodValidationPipe(schema)) dto: z.infer<typeof schema>, @Req() req: Request) {
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() || req.ip || "unknown";
    if (isRateLimited(ip)) {
      throw new HttpException(
        { error: "You've sent a few already — please try again later.", code: "rate_limited" },
        429,
      );
    }

    // Always resolves — falls back to the Biibisoft address when
    // SUPPORT_INBOX_EMAIL is unset, so feedback is never dropped because a
    // deploy is missing one env var. Still logged: an unset var in
    // production is worth noticing.
    const inbox = getFeedbackInboxEmail();
    if (!process.env.SUPPORT_INBOX_EMAIL?.trim()) {
      logger.warn("SUPPORT_INBOX_EMAIL not configured — feedback routed to the fallback address", { inbox });
    }

    try {
      await sendFeedbackNotification({
        to: inbox,
        message: dto.message,
        source: dto.source,
        path: dto.path,
        // Signed-in staff are identified from their session automatically;
        // anonymous senders stay anonymous unless they type an address.
        replyTo: dto.email || req.session?.email || undefined,
        staffName: req.session?.staffName,
        vendorName: req.session?.vendorName,
      });
    } catch (err) {
      logger.error("sendFeedbackNotification failed", { source: dto.source, err });
      throw new ServiceUnavailableException({
        error: "We couldn't send that just now. Please try again in a moment.",
        code: "send_failed",
      });
    }

    return { ok: true };
  }
}
