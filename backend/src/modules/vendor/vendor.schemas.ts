import { z } from "zod";

const DISPLAY_MODES = ["All", "FeaturedOnly", "AllWithFeaturedHighlighted"] as const;
const DEPOSIT_SETTINGS = ["None", "Fixed", "Percentage"] as const;
const HERO_CARD_MODES = ["CoverImage", "Gallery", "Video"] as const;
const STOREFRONT_THEME_VALUES = ["Red", "Emerald", "Indigo", "Orchid"] as const;

// Slug is deliberately excluded — changing it affects live URLs and the spec
// calls it "editable once"; that needs its own careful flow, not a plain
// field in a general settings PATCH.
export const updateVendorSchema = z
  .object({
    name: z.string().trim().min(1, "Business name is required").optional(),
    description: z.string().trim().optional(),
    location: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    logoUrl: z.string().trim().url().nullable().optional(),
    coverImageUrl: z.string().trim().url().nullable().optional(),
    personalWhatsappNumber: z.string().trim().nullable().optional(),
    ownerName: z.string().trim().max(80, "Keep the owner name under 80 characters").nullable().optional(),
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
    (data) => (data.depositSetting !== "Fixed" && data.depositSetting !== "Percentage" ? true : data.depositValue !== undefined && data.depositValue !== null),
    { message: "Enter a deposit amount or percentage", path: ["depositValue"] },
  );
export type UpdateVendorDto = z.infer<typeof updateVendorSchema>;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dayEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: z.string().regex(TIME_REGEX, "Time must be in HH:MM format").nullable(),
    closeTime: z.string().regex(TIME_REGEX, "Time must be in HH:MM format").nullable(),
  })
  .refine((day) => day.isClosed || (day.openTime && day.closeTime), {
    message: "Open and close time are required unless the day is marked closed",
  })
  .refine((day) => day.isClosed || !day.openTime || !day.closeTime || day.openTime < day.closeTime, {
    message: "Open time must be before close time",
  });

export const updateHoursSchema = z
  .object({ days: z.array(dayEntrySchema).length(7, "All 7 days must be included") })
  .refine((body) => new Set(body.days.map((d) => d.dayOfWeek)).size === 7, {
    message: "Each day of the week must appear exactly once",
  });
export type UpdateHoursDto = z.infer<typeof updateHoursSchema>;

const DOMAIN_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i;

export function addDomainSchema(platformHostname: string) {
  return z.object({
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .regex(DOMAIN_REGEX, "Enter a valid domain, e.g. yourshop.com")
      .refine((domain) => domain !== platformHostname, "That's the platform's own domain"),
  });
}

export const checkSlugSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+$/, "Slug must be lowercase letters and numbers only"),
});
