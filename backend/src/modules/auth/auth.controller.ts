import { Body, Controller, Get, Post } from "@nestjs/common";
import { z } from "zod";
import { CurrentSession, Public } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { AuthService } from "./auth.service";

const signInSchema = z.object({
  idToken: z.string().min(1),
  vendorId: z.string().optional(),
});

const switchSchema = z.object({ vendorId: z.string().min(1) });

// Every response here returns the JWT in the BODY. This API never sets a
// cookie — the Next.js app is the only thing that does, against whatever host
// the browser is actually on. See session.service.ts for why.
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("session")
  signIn(@Body(new ZodValidationPipe(signInSchema)) body: z.infer<typeof signInSchema>) {
    return this.auth.signIn(body.idToken, body.vendorId);
  }

  // No sign-out endpoint: there is no server-side session to destroy and no
  // cookie here to clear. Signing out is the frontend deleting its own
  // cookie. (A revocation list would be the reason to add one — the tokens
  // are long-lived and cannot currently be invalidated early.)

  @Get("me")
  me(@CurrentSession() session: SessionPayload) {
    return { session };
  }

  @Get("memberships")
  memberships(@CurrentSession() session: SessionPayload) {
    return this.auth.memberships(session.email);
  }

  // Re-scoping to another shop mints a BRAND NEW token rather than mutating
  // the current one; the frontend overwrites its cookie with it. Nothing to
  // diff, no client-side session cache to invalidate — the token never lived
  // in JavaScript to begin with.
  @Post("switch-vendor")
  switchVendor(
    @Body(new ZodValidationPipe(switchSchema)) body: z.infer<typeof switchSchema>,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.auth.switchVendor(session.email, body.vendorId);
  }
}
