import { Controller, Get } from "@nestjs/common";
import { CurrentSession } from "../../common/decorators";
import type { SessionPayload } from "../../common/session.types";
import { OverviewService } from "./overview.service";

@Controller("overview")
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  get(@CurrentSession() session: SessionPayload) {
    return this.overview.get(session.vendorId);
  }
}
