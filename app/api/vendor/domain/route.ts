import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getDomainProvider } from "@/lib/domains/factory";

const DOMAIN_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i;
const platformHostname = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:2665").hostname;

const addSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(DOMAIN_REGEX, "Enter a valid domain, e.g. yourshop.com")
    .refine((domain) => domain !== platformHostname, "That's the platform's own domain"),
});

// Live re-check every call — the DB's customDomainVerified flag is only a
// cache that middleware trusts for fast routing; this settings-facing
// endpoint always asks the provider for real-time DNS state instead.
export async function GET() {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const vendor = await db.vendor.findUnique({
    where: { id: auth.session.vendorId },
    select: { customDomain: true, customDomainVerified: true },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found", code: "not_found" }, { status: 404 });

  if (!vendor.customDomain) {
    return NextResponse.json({ domain: null, verified: false, instructions: [] });
  }

  const provider = getDomainProvider();
  const status = await provider.getStatus(vendor.customDomain);

  if (status.verified !== vendor.customDomainVerified) {
    await db.vendor.update({
      where: { id: auth.session.vendorId },
      data: { customDomainVerified: status.verified },
    });
  }

  return NextResponse.json({ domain: vendor.customDomain, verified: status.verified, instructions: status.instructions });
}

export async function POST(request: Request) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const { domain } = parsed.data;
  const provider = getDomainProvider();

  try {
    await provider.addDomain(domain);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add domain", code: "provider_error" },
      { status: 502 }
    );
  }

  try {
    await db.vendor.update({
      where: { id: auth.session.vendorId },
      data: { customDomain: domain, customDomainVerified: false },
    });
  } catch (err) {
    // Prisma unique-constraint conflict — another vendor already saved this domain.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "This domain is already connected to another storefront", code: "domain_taken" },
        { status: 409 }
      );
    }
    throw err;
  }

  const status = await provider.getStatus(domain);
  return NextResponse.json({ domain, verified: status.verified, instructions: status.instructions });
}

export async function DELETE() {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const vendor = await db.vendor.findUnique({
    where: { id: auth.session.vendorId },
    select: { customDomain: true },
  });

  if (vendor?.customDomain) {
    const provider = getDomainProvider();
    await provider.removeDomain(vendor.customDomain).catch(() => undefined);
  }

  await db.vendor.update({
    where: { id: auth.session.vendorId },
    data: { customDomain: null, customDomainVerified: false },
  });

  return NextResponse.json({ ok: true });
}
