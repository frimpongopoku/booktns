export interface DnsInstruction {
  type: "A" | "CNAME";
  host: string; // "@" for apex, or the subdomain label e.g. "www"
  value: string; // target IP/hostname; "" when the backing env var is unset
}

export interface DomainStatus {
  verified: boolean;
  instructions: DnsInstruction[];
}

export interface DomainProvider {
  addDomain(domain: string): Promise<void>;
  getStatus(domain: string): Promise<DomainStatus>;
  removeDomain(domain: string): Promise<void>;
}
