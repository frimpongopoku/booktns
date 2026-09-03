import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { serializeVendor } from "@/lib/serialize";

const DISPLAY_MODES = ["All", "FeaturedOnly", "AllWithFeaturedHighlighted"] as const;
const DEPOSIT_SETTINGS = ["None", "Fixed", "Percentage"] as const;
const HERO_CARD_MODES = ["CoverImage", "Gallery", "Video"] as const;
const STOREFRONT_THEME_VALUES = ["Red", "Emerald", "Indigo", "Orchid"] as const;

// Slug is deliberately excluded — changing it affects live URLs and spec
// calls it "editable once"; that needs its own careful flow, not a plain
// field in a general settings PATCH. Name/description/location/phone/
// logoUrl/coverImageUrl/display mode/publish are all safe to update freely.
const updateSchema = z
  .object({
    name: z.string().trim().min(1, "Business name is required").optional(),
    description: z.string().trim().optional(),
    location: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    logoUrl: z.string().trim().url().nullable().optional(),
    coverImageUrl: z.string().trim().url().nullable().optional(),
    personalWhatsappNumber: z.string().trim().nullable().optional(),
    ownerName: z.string().trim().max(80, "Keep the owner name under 80 characters").nullable().optional(),
    // Normalised to E.164 below rather than in the schema, so a number that
    // can't be parsed reports a phone-specific message instead of a regex one.
    ownerPhone: z.string().trim().nullable().optional(),
    ownerEmail: z.string().trim().email("Enter a valid email address").nullable().optional(),
    showOwnerName: z.boolean().optional(),
    showOwnerPhone: z.boolean().optional(),
    showOwnerEmail: z.boolean().optional(),
    showVideoSection: z.boolean().optional(),
    videoSectionTitle: z.string().trim().max(60, "Keep the title under 60 characters").nullable().optional(),
    videoSectionSubtitle: z.string().trim().max(120, "Keep the subtitle under 120 characters").nullable().optional(),
    depositSetting: z.enum(DEPOSIT_SETTINGS).optional(),
    depositValue: z.number().int().nonnegative().nullable().optional(),
    cancellationPolicy: z.string().trim().nullable().optional(),
    storefrontDisplayMode: z.enum(DISPLAY_MODES).optional(),
    storefrontPublished: z.boolean().optional(),
    heroCardMode: z.enum(HERO_CARD_MODES).optional(),
    heroGalleryUrls: z.array(z.string().trim().url()).max(6).optional(),
    heroVideoId: z.string().trim().nullable().optional(),
    storefrontTheme: z.enum(STOREFRONT_THEME_VALUES).optional(),
  })
  .refine(
    (data) => data.depositSetting !== "Fixed" && data.depositSetting !== "Percentage" ? true : data.depositValue !== undefined && data.depositValue !== null,
    { message: "Enter a deposit amount or percentage", path: ["depositValue"] }
  );

export async function GET() {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const vendor = await db.vendor.findUnique({ where: { id: auth.session.vendorId } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found", code: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ vendor: serializeVendor(vendor) });
}

export async function PATCH(request: Request) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  if (parsed.data.heroVideoId) {
    const heroVideo = await db.vendorVideo.findFirst({
      where: { id: parsed.data.heroVideoId, vendorId: auth.session.vendorId },
      select: { id: true },
    });
    if (!heroVideo) {
      return NextResponse.json({ error: "Video not found", code: "not_found" }, { status: 400 });
    }
  }

  // Phone numbers are always stored E.164 (CLAUDE.md § Data Rules). An
  // empty string clears the field; anything unparseable is a 400 rather
  // than a silently mangled number.
  const data = { ...parsed.data };
  if (data.ownerPhone !== undefined) {
    if (!data.ownerPhone) {
      data.ownerPhone = null;
    } else {
      const normalized = normalizePhone(data.ownerPhone);
      if (!normalized) {
        return NextResponse.json({ error: "Enter a valid phone number", code: "invalid_request" }, { status: 400 });
      }
      data.ownerPhone = normalized;
    }
  }

  const vendor = await db.vendor.update({
    where: { id: auth.session.vendorId },
    data,
  });

  return NextResponse.json({ vendor: serializeVendor(vendor) });
}
