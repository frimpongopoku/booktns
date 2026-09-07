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

    // Vercel returns this same 409 whether THIS project already owns the
    // domain (harmless — nothing to do) or a DIFFERENT project already
    // claims it, including another one of this same account's projects.
    // Those are not the same outcome: the second one means Vercel's edge
    // will keep routing every request for this domain to that other
    // project's deployment — our own app is never even invoked, so no
    // amount of DNS or app-level correctness here would ever show it.
    // Blindly treating both as success is exactly how a vendor's domain
    // can end up "verified" in our UI while silently serving someone
    // else's site. Confirm real ownership before declaring success.
    if (res.status === 409) {
      const ownershipCheck = await fetch(`${API_BASE}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`, {
        headers: authHeaders(),
      });
      if (ownershipCheck.ok) return;
      throw new Error(
        `"${domain}" is already connected to a different Vercel project in this account. Remove it from that project's Domains settings in the Vercel dashboard, then try again here.`
      );
    }

    throw new Error(body?.error?.message ?? `Vercel addDomain failed (${res.status})`);
  }

  async getStatus(domain: string): Promise<DomainStatus> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const instructions = generateDnsInstructions(domain);

    let statusRes = await fetch(`${API_BASE}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`, {
      headers: authHeaders(),
    });

    // Self-heals a domain this project doesn't actually know about yet — the
    // real gap this closes: a vendor whose domain was added back when
    // VERCEL_API_TOKEN/VERCEL_PROJECT_ID weren't set yet (ManualDnsDomainProvider
    // was active, whose addDomain() is a no-op) has a domain sitting in our
    // own DB that Vercel has never heard of, and no code path ever retries
    // registering it once these credentials are added later — every future
    // Recheck would 404 forever. A 404 here specifically means "not
    // registered with this project," not "misconfigured," so it's safe to
    // register it now and re-check; any other failure falls through to the
    // generic not-verified return below instead of risking a spurious add.
    if (statusRes.status === 404) {
      await this.addDomain(domain).catch(() => undefined);
      statusRes = await fetch(`${API_BASE}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`, {
        headers: authHeaders(),
      });
    }

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
