import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import { OnboardingService } from "./onboarding.service";
import { createOnboardingSchema, type CreateOnboardingDto } from "./onboarding.schemas";

// Public: this creates the FIRST Vendor + owner Staff row, before any
// session can exist. The one deliberate exception (per CLAUDE.md's auth
// rules) to "Google Sign-In never creates a Staff record."
@Public()
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createOnboardingSchema)) dto: CreateOnboardingDto) {
    return this.onboarding.create(dto);
  }
}
