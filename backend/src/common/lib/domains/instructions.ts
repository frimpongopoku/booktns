import type { DnsInstruction } from "./types";

// Apex-vs-subdomain detection is a simple label-count heuristic (2 labels =
// apex, e.g. "yourshop.com"; 3+ = subdomain, e.g. "shop.yourshop.com").
// Known limitation: this misclassifies multi-part public-suffix apexes like
// "yourshop.co.uk" as a subdomain of "co.uk" — acceptable scoped
// simplification for v1, not a full public-suffix-list parser.
export function isApexDomain(domain: string): boolean {
  return domain.split(".").length === 2;
}

// Shared by both DomainProvider implementations so instruction *values*
// never drift between the dev and prod paths. Generates both an A record
// (apex) and a CNAME for "www" — vendors expect both the bare domain and
// www to work, and won't think to ask for the second record themselves.
// An empty env var produces value:"", which the Settings UI treats as
// "still finishing setup" rather than a broken/empty instruction.
export function generateDnsInstructions(domain: string): DnsInstruction[] {
  const apexIp = process.env.PLATFORM_APEX_IP ?? "";
  const cnameTarget = process.env.PLATFORM_CNAME_TARGET ?? "";

  if (isApexDomain(domain)) {
    return [
      { type: "A", host: "@", value: apexIp },
      { type: "CNAME", host: "www", value: cnameTarget },
    ];
  }

  const label = domain.split(".")[0];
  return [{ type: "CNAME", host: label, value: cnameTarget }];
}
