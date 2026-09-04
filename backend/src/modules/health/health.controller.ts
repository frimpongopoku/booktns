import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../../common/decorators";
import { buildHealthReport } from "../../common/lib/health";

@Public()
@Controller()
export class HealthController {
  // Dependency-free. THIS is what Railway's healthcheck and any uptime
  // monitor should point at — /health below makes real authenticated round
  // trips to Postgres, R2, Resend and Firebase, so probing it would let a
  // third-party blip restart the service.
  @Get("ping")
  ping() {
    return { ok: true, at: new Date().toISOString() };
  }

  @Get("health")
  async health(@Res({ passthrough: true }) res: Response) {
    const report = await buildHealthReport();
    // Only a hard error is a 503. "warn" means working, but on a dev
    // fallback that must not be in production.
    res.status(report.status === "error" ? 503 : 200);
    return report;
  }
}
