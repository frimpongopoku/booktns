import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { getApps } from "firebase-admin/app";
import { db } from "@/lib/db";
import { r2Client } from "@/lib/storage";
import { PRIVATE_BUCKET, isPrivateStorageConfigured } from "@/lib/private-storage";

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

// Each check gets its own budget so one slow third party can't hold the whole
// page open.
const CHECK_TIMEOUT_MS = 3000;

export function overallStatus(results: HealthCheckResult[]): CheckStatus {
  if (results.some((r) => r.status === "error")) return "error";
  if (results.some((r) => r.status === "warn")) return "warn";
  return "ok";
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);
}

// --- Individual checks -----------------------------------------------------
//
// Every check below does a real round trip wherever one is possible. Asserting
// that an env var is set proves nothing: a credential can be revoked, a bucket
// deleted, a database unreachable, and a presence-only check still shows green.

async function checkDatabase(): Promise<CheckOutcome> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "ok", detail: "Connected and responding to queries." };
  } catch (err) {
    return { status: "error", detail: `Unreachable — ${errorMessage(err)}` };
  }
}

async function checkPublicStorage(): Promise<CheckOutcome> {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  if (!bucket) {
    return { status: "error", detail: "Not configured — image and PDF uploads will fail." };
  }

  try {
    await r2Client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { status: "ok", detail: `Bucket "${bucket}" reachable with the configured credentials.` };
  } catch (err) {
    return { status: "error", detail: `Configured but unreachable — ${errorMessage(err)}` };
  }
}

async function checkPrivateStorage(): Promise<CheckOutcome> {
  if (!isPrivateStorageConfigured()) {
    return {
      status: "warn",
      detail: "Not configured — ID documents fall back to local disk (fine for dev, not production).",
    };
  }

  try {
    await r2Client.send(new HeadBucketCommand({ Bucket: PRIVATE_BUCKET }));
    return { status: "ok", detail: `Private bucket "${PRIVATE_BUCKET}" reachable.` };
  } catch (err) {
    return { status: "error", detail: `Configured but unreachable — ${errorMessage(err)}` };
  }
}

// An authenticated call, not a ping: a 200 from /domains proves the API key is
// live, which is the thing that actually breaks when a key is rotated.
async function checkEmail(): Promise<CheckOutcome> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { status: "warn", detail: "Not configured — booking emails are skipped (fine for dev, not production)." };
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    // A "sending access" key is a legitimate, recommended setup, and it is
    // *rejected* by /domains while still being perfectly able to send. Resend
    // distinguishes the two: `restricted_api_key` means the key is live but
    // scoped, which is a pass — only an actually invalid key is a failure.
    if (res.ok) {
      return { status: "ok", detail: "API key accepted by Resend (full access)." };
    }

    const body = (await res.json().catch(() => null)) as { name?: string; message?: string } | null;
    if (body?.name === "restricted_api_key") {
      return { status: "ok", detail: "API key live (sending-access scope)." };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        status: "error",
        detail: `API key rejected by Resend (HTTP ${res.status}${body?.name ? `, ${body.name}` : ""}) — it may have been revoked.`,
      };
    }
    return { status: "error", detail: `Resend returned HTTP ${res.status}.` };
  } catch (err) {
    return { status: "error", detail: `Configured but unreachable — ${errorMessage(err)}` };
  }
}

async function checkSms(): Promise<CheckOutcome> {
  const key = process.env.AFRICAS_TALKING_API_KEY;
  const username = process.env.AFRICAS_TALKING_USERNAME;
  if (!key || !username) {
    return { status: "warn", detail: "Not configured — booking SMS is skipped (fine for dev, not production)." };
  }

  try {
    const res = await fetch(`https://api.africastalking.com/version1/user?username=${encodeURIComponent(username)}`, {
      headers: { apiKey: key, Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      return { status: "error", detail: "API key rejected by Africa's Talking." };
    }
    if (!res.ok) {
      return { status: "error", detail: `Africa's Talking returned HTTP ${res.status}.` };
    }
    return { status: "ok", detail: "API key accepted by Africa's Talking." };
  } catch (err) {
    return { status: "error", detail: `Configured but unreachable — ${errorMessage(err)}` };
  }
}

// Structural, deliberately. Verifying a real Google ID token needs a token we
// don't have here, so the strongest available check is that the Admin SDK
// initialised with usable credentials.
function checkFirebase(): CheckOutcome {
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return { status: "error", detail: "Not configured — staff sign-in will fail." };
  }
  if (getApps().length === 0) {
    return { status: "ok", detail: "Credentials present; Admin SDK initialises on first sign-in." };
  }
  return { status: "ok", detail: "Admin SDK initialised." };
}

async function checkCustomDomains(): Promise<CheckOutcome> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return {
      status: "warn",
      detail: "Not configured — using live DNS lookups to verify domains (no automatic TLS).",
    };
  }

  try {
    const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
    const res = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}${team}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { status: "error", detail: "API token rejected by Vercel." };
    }
    if (!res.ok) {
      return { status: "error", detail: `Vercel returned HTTP ${res.status}.` };
    }
    return { status: "ok", detail: "Project reachable with the configured token." };
  } catch (err) {
    return { status: "error", detail: `Configured but unreachable — ${errorMessage(err)}` };
  }
}

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
    ["Database (Postgres)", checkDatabase],
    ["Media storage (R2)", checkPublicStorage],
    ["ID document storage (R2 private)", checkPrivateStorage],
    ["Transactional email (Resend)", checkEmail],
    ["SMS notifications (Africa's Talking)", checkSms],
    ["Google sign-in (Firebase)", checkFirebase],
    ["Custom domains", checkCustomDomains],
    ["Error tracking (Sentry)", checkErrorTracking],
    ["Analytics (PostHog)", checkAnalytics],
  ];

  // All in parallel, each individually timed and individually caught, so one
  // failing check can never take the whole page down.
  return Promise.all(
    checks.map(async ([name, run]) => {
      const start = Date.now();
      try {
        const outcome = await withTimeout(Promise.resolve(run()), CHECK_TIMEOUT_MS);
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
// This endpoint is unauthenticated, so treat every request as hostile.
//
// Two things make the raw report unsafe to serve publicly. It amplifies: one
// cheap HTTP request fans out into nine real upstream calls — a Postgres
// query, two R2 HeadBucket calls, live API calls to Resend and Africa's
// Talking, a DNS lookup. A bot looping on it burns third-party quota and real
// money, and can get the account rate-limited by those providers. And it
// narrates: `detail` carries bucket names, provider names and raw upstream
// error text, which is free reconnaissance.
//
// The cache fixes the first; redaction fixes the second.

const CACHE_TTL_MS = 20_000;
let cached: { at: number; report: HealthReport } | null = null;
let inFlight: Promise<HealthReport> | null = null;

// One sweep per TTL no matter how many callers arrive, and concurrent callers
// share a single in-flight run rather than each starting their own — without
// that, a burst of simultaneous requests all miss the cache together and the
// fan-out happens anyway.
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
// Mirrors the vocabulary a public status page uses ("Connected",
// "Reachable") rather than echoing our own diagnostics.
const PUBLIC_DETAIL: Record<CheckStatus, string> = {
  ok: "Operational",
  warn: "Degraded",
  error: "Not responding",
};

// Strips every check down to name, status and timing. No bucket names, no
// provider error strings, no configuration hints. Anyone who needs the real
// detail is signed in to the platform console.
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
