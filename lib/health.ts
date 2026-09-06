// ok    — working.
// warn  — working, but on a development fallback that must not be running in
//         production. This is the state that makes the page useful: a local
//         machine showing amber is correct, and production showing amber is
//         an immediate signal that something wasn't wired up at deploy time.
// error — configured but not working.
export type CheckStatus = "ok" | "warn" | "error";

export interface HealthCheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
  ms: number;
}

type CheckOutcome = Pick<HealthCheckResult, "status" | "detail">;

export interface HealthReport {
  status: CheckStatus;
  checkedAt: string;
  totalMs: number;
  checks: HealthCheckResult[];
}

export function overallStatus(results: HealthCheckResult[]): CheckStatus {
  if (results.some((r) => r.status === "error")) return "error";
  if (results.some((r) => r.status === "warn")) return "warn";
  return "ok";
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// --- Individual checks -----------------------------------------------------
//
// This is deliberately short. Database, media/ID storage, transactional
// email/SMS, Google sign-in verification, and custom-domain provisioning are
// all NestJS API concerns now — the backend's own /health already covers
// them (see the "other half" link on the rendered page below). Everything
// that used to live here for those checks was removed in the same pass that
// took the frontend's Prisma/database access away entirely: checking an env
// var this app no longer reads would just be a config-presence assertion
// with nothing real behind it.

// Config presence only, and optional — an unset DSN means errors aren't
// reported anywhere, which is worth flagging but is not an outage.
function checkErrorTracking(): CheckOutcome {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return { status: "warn", detail: "No DSN set — errors aren't being reported anywhere." };
  }
  return { status: "ok", detail: "DSN configured." };
}

function checkAnalytics(): CheckOutcome {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return { status: "warn", detail: "No project key set — storefront analytics are disabled." };
  }
  return { status: "ok", detail: "Project key configured." };
}

// --- Runner ----------------------------------------------------------------

export async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const checks: [string, () => Promise<CheckOutcome> | CheckOutcome][] = [
    ["Error tracking (Sentry)", checkErrorTracking],
    ["Analytics (PostHog)", checkAnalytics],
  ];

  return Promise.all(
    checks.map(async ([name, run]) => {
      const start = Date.now();
      try {
        const outcome = await Promise.resolve(run());
        return { name, ...outcome, ms: Date.now() - start };
      } catch (err) {
        return { name, status: "error" as const, detail: errorMessage(err), ms: Date.now() - start };
      }
    })
  );
}

export async function buildHealthReport(): Promise<HealthReport> {
  const start = Date.now();
  const checks = await runHealthChecks();
  return {
    status: overallStatus(checks),
    checkedAt: new Date().toISOString(),
    totalMs: Date.now() - start,
    checks,
  };
}

// --- Public exposure --------------------------------------------------------
//
// Both remaining checks are cheap config-presence reads with no upstream
// call, so the amplification concern the old nine-check version had to
// guard against (fan-out into Postgres/R2/Resend/etc. on every request)
// no longer applies — but the cache stays, since a public endpoint should
// never assume its own checks will always stay cheap.

const CACHE_TTL_MS = 20_000;
let cached: { at: number; report: HealthReport } | null = null;
let inFlight: Promise<HealthReport> | null = null;

export async function getCachedHealthReport(): Promise<{ report: HealthReport; cached: boolean }> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return { report: cached.report, cached: true };
  }
  if (!inFlight) {
    inFlight = buildHealthReport()
      .then((report) => {
        cached = { at: Date.now(), report };
        return report;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return { report: await inFlight, cached: false };
}

// What each status means, in words, without naming the thing behind it.
const PUBLIC_DETAIL: Record<CheckStatus, string> = {
  ok: "Operational",
  warn: "Degraded",
  error: "Not responding",
};

// Strips every check down to name, status and timing.
export function redactForPublic(report: HealthReport): HealthReport {
  return {
    ...report,
    checks: report.checks.map((c) => ({
      name: c.name,
      status: c.status,
      detail: PUBLIC_DETAIL[c.status],
      ms: c.ms,
    })),
  };
}
