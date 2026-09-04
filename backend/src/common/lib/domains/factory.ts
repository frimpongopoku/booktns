import type { DomainProvider } from "./types";
import { ManualDnsDomainProvider } from "./manual-provider";
import { VercelDomainProvider } from "./vercel-provider";

export function getDomainProvider(): DomainProvider {
  if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
    return new VercelDomainProvider();
  }
  return new ManualDnsDomainProvider();
}
