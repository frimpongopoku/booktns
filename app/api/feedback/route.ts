import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sendFeedbackNotification } from "@/lib/email";
import { getFeedbackInboxEmail, FEEDBACK_SOURCES } from "@/lib/feedback";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  message: z.string().trim().min(1, "Please tell us what's on your mind").max(5000),
  // Optional — a shopper on a storefront has no account and we shouldn't
  // demand an address just to hear from them. Only used to reply.
  email: z.string().trim().email("That doesn't look like a valid email").max(320).optional().or(z.literal("")),
  source: z.enum(FEEDBACK_SOURCES),
  // Where they were when they hit the button. Plain path only.
  path: z.string().trim().max(512).optional(),
});

// Unauthenticated on purpose — the storefront and landing page need it, and
// those visitors have no account by design. That makes it an open relay
// into our own inbox, so it carries its own throttle: without one, a single
// script could bury the support inbox and burn the Resend quota.
//
// Deliberately in-memory rather than Redis: there is no cache layer in this
// project (CLAUDE.md § Stack) and provisioning one for a feedback button
// would be exactly the "ahead of need" the stack table warns against. The
// tradeoff is that the limit is per-instance, which is the right shape for
// slowing down casual abuse and the wrong shape for a determined attacker.
// Revisit alongside login rate limiting, when a shared store earns itself.
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

  // The map would otherwise grow unbounded across the process's lifetime.
  if (submissionsByIp.size > 5000) {
    for (const [key, times] of submissionsByIp) {
      if (times.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) submissionsByIp.delete(key);
    }
  }
  return false;
}

export async function POST(request: Request) {
  // Always resolves — falls back to the Biibisoft support address when
  // SUPPORT_INBOX_EMAIL is unset, so feedback is never dropped on the floor
  // just because a deploy is missing one env var. Still logged, because an
  // unset var in production is worth noticing.
  const inbox = getFeedbackInboxEmail();
  if (!process.env.SUPPORT_INBOX_EMAIL?.trim()) {
    logger.warn("SUPPORT_INBOX_EMAIL not configured — feedback routed to the fallback address", { inbox });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0].trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "You've sent a few already — please try again later.", code: "rate_limited" },
      { status: 429 }
    );
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  // Signed-in staff are identified automatically so we know who we're
  // talking to; anonymous senders stay anonymous unless they type an
  // address themselves.
  const session = await getSession();

  try {
    await sendFeedbackNotification({
      to: inbox,
      message: parsed.data.message,
      source: parsed.data.source,
      path: parsed.data.path,
      replyTo: parsed.data.email || session?.email || undefined,
      staffName: session?.staffName,
      vendorName: session?.vendorName,
    });
  } catch (err) {
    logger.error("sendFeedbackNotification failed", { source: parsed.data.source, err });
    return NextResponse.json(
      { error: "We couldn't send that just now. Please try again in a moment.", code: "send_failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
