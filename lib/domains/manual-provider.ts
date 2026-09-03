import { resolve4, resolveCname } from "node:dns/promises";
import type { DomainProvider, DomainStatus } from "./types";
import { generateDnsInstructions, isApexDomain } from "./instructions";

function normalize(host: string): string {
  return host.replace(/\.$/, "").toLowerCase();
}

// Dev-only fallback used when no Vercel credentials are configured (see
// factory.ts). Does a real DNS lookup instead of calling an external API —
// no domain "registration" step exists in this mode, so addDomain/
// removeDomain are no-ops and getStatus is a live check on demand.
//
// Only checks the primary record (the A record for an apex domain, or the
// single CNAME for a subdomain) — not the apex+www pair together. That's an
// acceptable scoped simplification for a dev-only path; the Vercel provider
// is the one that matters for real verification correctness.
export class ManualDnsDomainProvider implements DomainProvider {
  async addDomain(): Promise<void> {
    // Nothing to register externally in dev mode.
  }

  async getStatus(domain: string): Promise<DomainStatus> {
    const instructions = generateDnsInstructions(domain);
    const expected = isApexDomain(domain)
      ? instructions.find((i) => i.type === "A")?.value
      : instructions.find((i) => i.type === "CNAME")?.value;

    if (!expected) return { verified: false, instructions };

    try {
      if (isApexDomain(domain)) {
        const addrs = await resolve4(domain);
        return { verified: addrs.includes(expected), instructions };
      }
      const cnames = await resolveCname(domain);
      const normalizedExpected = normalize(expected);
      return { verified: cnames.some((c) => normalize(c) === normalizedExpected), instructions };
    } catch {
      // NXDOMAIN, timeout, no records yet, etc. — never throw, just "not verified yet".
      return { verified: false, instructions };
    }
  }

  async removeDomain(): Promise<void> {
    // Nothing to release externally in dev mode.
  }
}
