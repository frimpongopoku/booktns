import { Body, Controller, Delete, Get, Post, Res } from "@nestjs/common";
import type { Response } from "express";
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

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Google handshake. Firebase verifies identity; we issue our own session.
  @Public()
  @Post("session")
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) body: z.infer<typeof signInSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.signIn(body.idToken, body.vendorId, res);
  }

  @Public()
  @Delete("session")
  signOut(@Res({ passthrough: true }) res: Response) {
    this.auth.signOut(res);
    return { ok: true };
  }

  // Who am I — lets the frontend render without decoding a cookie it can't
  // read (the cookie is httpOnly by design).
  @Get("me")
  me(@CurrentSession() session: SessionPayload) {
    return { session };
  }

  @Get("memberships")
  memberships(@CurrentSession() session: SessionPayload) {
    return this.auth.memberships(session.email);
  }

  @Post("switch-vendor")
  async switchVendor(
    @Body(new ZodValidationPipe(switchSchema)) body: z.infer<typeof switchSchema>,
    @CurrentSession() session: SessionPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.switchVendor(session.email, body.vendorId, res);
  }
}
