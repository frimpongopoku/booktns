import { Controller, Get, Header, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { Public, SuperAdminOnly } from "../../common/decorators";
import { buildHealthReport, getCachedHealthReport, redactForPublic } from "../../common/lib/health";
import { renderHealthPage } from "./health.view";

@Controller()
export class HealthController {
  // Dependency-free and deliberately trivial. THIS is what Railway's
  // healthcheck and any uptime monitor point at — it touches nothing, so it
  // costs nothing to hammer and cannot be turned into an amplifier.
  @Public()
  @Get("ping")
  @Header("Cache-Control", "no-store")
  ping() {
    return { ok: true, at: new Date().toISOString() };
  }

  // Public status page. Safe to hit repeatedly because of two things:
  //
  //  - the report is cached for 20s and concurrent callers share one
  //    in-flight sweep, so a flood of requests still produces at most one
  //    round of upstream calls per window; and
  //  - everything is redacted to name/status/timing, so it reveals nothing
  //    about bucket names, providers or configuration.
  //
  // Serves HTML to browsers and JSON to machines.
  @Public()
  @Get("health")
  async health(@Req() req: Request, @Res() res: Response) {
    const { report, cached } = await getCachedHealthReport();
    const publicReport = redactForPublic(report);

    // Only a hard error is a 503; "warn" means working, but on a fallback
    // that shouldn't be in production.
    res.status(publicReport.status === "error" ? 503 : 200);
    // Cacheable by the browser for the same window as the server-side cache,
    // so a refresh-happy tab doesn't even reach us.
    res.setHeader("Cache-Control", "public, max-age=20");
    res.setHeader("X-Health-Cache", cached ? "hit" : "miss");

    const accept = req.headers.accept ?? "";
    const wantsJson =
      req.query.format === "json" || (!accept.includes("text/html") && accept.includes("application/json"));

    if (wantsJson) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(JSON.stringify(publicReport));
      return;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderHealthPage(publicReport));
  }

  // The unredacted report — bucket names, provider error strings, the lot.
  // Superadmin only, uncached, because this is the one a human uses to
  // actually diagnose a broken deploy and a stale answer would mislead them.
  @SuperAdminOnly()
  @Get("health/detail")
  @Header("Cache-Control", "private, no-store")
  async detail(@Query("_") _unused?: string) {
    return buildHealthReport();
  }
}
