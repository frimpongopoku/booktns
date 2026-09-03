import type { DomainProvider, DomainStatus } from "./types";
import { generateDnsInstructions } from "./instructions";

const API_BASE = "https://api.vercel.com";

function teamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, "Content-Type": "application/json" };
}

// Production provider — calls Vercel's Domains API. See getStatus for the
// critical gotcha: Vercel's own "verified" field does NOT mean "DNS is
// live," and treating it that way will show a vendor "Connected!" before
// they've configured any DNS at all.
export class VercelDomainProvider implements DomainProvider {
  async addDomain(domain: string): Promise<void> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const res = await fetch(`${API_BASE}/v10/projects/${projectId}/domains${teamQuery()}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: domain }),
    });
    if (res.ok) return;

    const body = await res.json().catch(() => null);
    // Idempotent: this project already owns the domain — treat as success.
    if (res.status === 409 && body?.error?.code === "domain_already_in_use") return;

    throw new Error(body?.error?.message ?? `Vercel addDomain failed (${res.status})`);
  }

  async getStatus(domain: string): Promise<DomainStatus> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const instructions = generateDnsInstructions(domain);

    const statusRes = await fetch(`${API_BASE}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`, {
      headers: authHeaders(),
    });
    if (!statusRes.ok) return { verified: false, instructions };
    const statusData = await statusRes.json();

    // GOTCHA (critical): statusData.verified means *ownership* verified —
    // relevant only when another Vercel project already claims the domain.
    // For a domain nobody else has claimed, Vercel returns verified:true
    // immediately on add, BEFORE any DNS is actually configured. Do NOT
    // treat verified:true alone as "DNS is live" — must also check the
    // domain-config endpoint's `misconfigured` flag, which is what
    // actually reflects real DNS state.
    if (!statusData.verified) return { verified: false, instructions };

    const configRes = await fetch(`${API_BASE}/v6/domains/${domain}/config${teamQuery()}`, {
      headers: authHeaders(),
    });
    if (!configRes.ok) return { verified: false, instructions };
    const configData = await configRes.json();

    return { verified: statusData.verified && !configData.misconfigured, instructions };
  }

  async removeDomain(domain: string): Promise<void> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    // Best-effort — a failed remove here shouldn't block clearing our own
    // customDomain/customDomainVerified fields (see the DELETE route).
    await fetch(`${API_BASE}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => undefined);
  }
}
