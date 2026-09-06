"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BusinessHours, Vendor, StorefrontDisplayMode, HeroCardMode, VendorVideo, StorefrontTheme, Service } from "@/types";
import { formatPrice, formatDuration } from "@/lib/data";
import { apiBrowser, ApiError } from "@/lib/api-client";
import { STOREFRONT_THEMES } from "@/lib/theme";
import Topbar from "@/components/dashboard/Topbar";
import BusinessHoursCard from "@/components/dashboard/BusinessHoursCard";
import MediaPickerModal from "@/components/dashboard/MediaPickerModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { AutoSaveBadge, ManualSaveBadge, UnsavedChangesBar } from "@/components/dashboard/SaveState";
import PlatformCredit from "@/components/shared/PlatformCredit";
import VerificationTab, { type VerificationApplication } from "@/components/dashboard/VerificationTab";
import QrCodeCard from "@/components/dashboard/QrCodeCard";
import { CreditCard, Smartphone, Banknote, Check, ImagePlus, ExternalLink, Rocket, X, Plus, Archive, CalendarDays, Globe, ShieldCheck, AlertTriangle, Share2, MessageCircle } from "lucide-react";

const DISPLAY_MODE_OPTIONS: { value: StorefrontDisplayMode; label: string; desc: string }[] = [
  { value: "All", label: "Show all", desc: "Every active service/product appears on your home page" },
  { value: "FeaturedOnly", label: "Featured only", desc: "Only items you've marked as featured appear" },
  { value: "AllWithFeaturedHighlighted", label: "Show all, highlight featured", desc: "Everything appears, but featured items are shown first with a badge" },
];

const HERO_MODE_OPTIONS: { value: HeroCardMode; label: string; desc: string }[] = [
  { value: "CoverImage", label: "Cover image", desc: "Uses the cover image above (or a plain gradient if you haven't set one)" },
  { value: "Gallery", label: "Photo gallery", desc: "Rotates through several photos" },
  { value: "Video", label: "Video", desc: "Plays one of your videos on a loop" },
];

const THEME_OPTIONS: StorefrontTheme[] = ["Red", "Emerald", "Indigo", "Orchid"];

type SettingsTab = "storefront" | "domain" | "verification" | "booking" | "share" | "calendar" | "whatsapp" | "billing" | "support";

// Hidden from the UI (user decision, 2026-09-01): the WhatsApp bot is parked
// per CLAUDE.md § Parked Features, and billing isn't live yet — showing
// either invites a vendor to configure something that does nothing. The tabs
// and their components are kept intact rather than deleted, so bringing
// either back is deleting one entry from this list.
const HIDDEN_TABS: SettingsTab[] = ["whatsapp", "billing"];

const ALL_TABS: { key: SettingsTab; label: string }[] = [
  { key: "storefront", label: "Storefront" },
  { key: "domain", label: "Domain" },
  { key: "verification", label: "Verification" },
  { key: "booking", label: "Booking" },
  { key: "share", label: "Booking link" },
  { key: "calendar", label: "Calendar" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "billing", label: "Billing" },
  { key: "support", label: "Help & Support" },
];

const VISIBLE_TABS = ALL_TABS.filter((t) => !HIDDEN_TABS.includes(t.key));

// Second-level nav inside the Storefront tab. Ordered by how a vendor
// actually sets a shop up: what it looks like, how the home page is laid
// out, the facts about the business, then when it's open.
type StorefrontSection = "branding" | "home" | "details" | "hours";

const STOREFRONT_SECTIONS: { key: StorefrontSection; label: string }[] = [
  { key: "branding", label: "Branding" },
  { key: "home", label: "Home page" },
  { key: "details", label: "Business details" },
  { key: "hours", label: "Opening hours" },
];

const CALENDAR_SYNC_BENEFITS = [
  {
    title: "Never miss an appointment",
    desc: "Every booking sits right alongside your personal schedule — not in a separate app you have to remember to open.",
  },
  {
    title: "Get reminders automatically",
    desc: "Google Calendar's own notifications fire before each appointment, using whatever reminder settings you already have.",
  },
  {
    title: "Avoid double-booking your own time",
    desc: "See your bookings when planning anything else, so nothing personal collides with a client appointment.",
  },
  {
    title: "Stays up to date on its own",
    desc: "Add this link once — new bookings, cancellations, and reschedules keep syncing automatically after that.",
  },
];

const BILLING_HISTORY = [
  { date: "Jun 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
  { date: "May 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
  { date: "Apr 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
];


interface OwnerDetailFieldProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  shown: boolean;
  onShownChange: (shown: boolean) => void;
}

// One owner detail plus its own storefront-visibility toggle. Each detail
// gets its own toggle rather than one master switch: publishing an
// "owned by …" credit is a different decision from publishing a personal
// phone number, and vendors routinely want the first without the second.
function OwnerDetailField({ label, type = "text", placeholder, value, onValueChange, shown, onShownChange }: OwnerDetailFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
      <label
        className="flex items-center gap-2 text-xs w-fit cursor-pointer"
        style={{ color: value.trim() ? "var(--tx2)" : "var(--tx3)" }}
      >
        <input
          type="checkbox"
          checked={shown}
          disabled={!value.trim()}
          onChange={(e) => onShownChange(e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-[var(--ac)] focus:outline-none focus:ring-1 focus:ring-[var(--ac)] disabled:opacity-40"
        />
        Show on storefront
      </label>
    </div>
  );
}

interface StorefrontTabProps {
  vendor: Vendor;
  businessHours: BusinessHours[];
  initialVideos: VendorVideo[];
}

function StorefrontTab({ vendor, businessHours, initialVideos }: StorefrontTabProps) {
  // Everything the Save bar governs is mirrored here as it was last written,
  // so "are there unsaved changes?" is answered by comparing against the
  // server's actual state rather than by a flag someone has to remember to
  // set on every onChange.
  const [savedFields, setSavedFields] = useState({
    name: vendor.name,
    description: vendor.description,
    location: vendor.location,
    phone: vendor.phone,
    whatsapp: vendor.personalWhatsappNumber ?? "",
    ownerName: vendor.ownerName ?? "",
    ownerPhone: vendor.ownerPhone ?? "",
    ownerEmail: vendor.ownerEmail ?? "",
    showOwnerName: vendor.showOwnerName,
    showOwnerPhone: vendor.showOwnerPhone,
    showOwnerEmail: vendor.showOwnerEmail,
    displayMode: vendor.storefrontDisplayMode,
  });

  const [name, setName] = useState(savedFields.name);
  const [description, setDescription] = useState(savedFields.description);
  const [location, setLocation] = useState(savedFields.location);
  const [phone, setPhone] = useState(savedFields.phone);
  const [whatsapp, setWhatsapp] = useState(savedFields.whatsapp);
  const [ownerName, setOwnerName] = useState(savedFields.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(savedFields.ownerPhone);
  const [ownerEmail, setOwnerEmail] = useState(savedFields.ownerEmail);
  const [showOwnerName, setShowOwnerName] = useState(savedFields.showOwnerName);
  const [showOwnerPhone, setShowOwnerPhone] = useState(savedFields.showOwnerPhone);
  const [showOwnerEmail, setShowOwnerEmail] = useState(savedFields.showOwnerEmail);
  const [logoUrl, setLogoUrl] = useState(vendor.logoUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(vendor.coverImageUrl);
  const [displayMode, setDisplayMode] = useState<StorefrontDisplayMode>(savedFields.displayMode);
  const [published, setPublished] = useState(vendor.storefrontPublished);
  const [heroCardMode, setHeroCardMode] = useState<HeroCardMode>(vendor.heroCardMode);
  const [heroGalleryUrls, setHeroGalleryUrls] = useState<string[]>(vendor.heroGalleryUrls);
  const [heroVideoId, setHeroVideoId] = useState(vendor.heroVideoId);
  const [storefrontTheme, setStorefrontTheme] = useState<StorefrontTheme>(vendor.storefrontTheme);
  const [activeSection, setSection] = useState<StorefrontSection>("branding");
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [savingHeroMode, setSavingHeroMode] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);
  const [savingHeroVideo, setSavingHeroVideo] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchVendor = async (body: Record<string, unknown>) => {
    try {
      return await apiBrowser<{ vendor: Vendor }>("/vendor", { method: "PATCH", body });
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  // Logo and cover image save immediately on selection/removal — waiting for
  // the separate "Save Changes" button was an easy step to miss, since
  // picking a photo already feels like a complete action on its own.
  const handleLogoChange = async (url: string | undefined) => {
    setSavingLogo(true);
    setError(null);
    try {
      await patchVendor({ logoUrl: url ?? null });
      setLogoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSavingLogo(false);
    }
  };

  const handleCoverChange = async (url: string | undefined) => {
    setSavingCover(true);
    setError(null);
    try {
      await patchVendor({ coverImageUrl: url ?? null });
      setCoverImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSavingCover(false);
    }
  };

  const handleHeroModeChange = async (mode: HeroCardMode) => {
    setSavingHeroMode(true);
    setError(null);
    try {
      await patchVendor({ heroCardMode: mode });
      setHeroCardMode(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSavingHeroMode(false);
    }
  };

  const handleGalleryChange = async (urls: string[]) => {
    setSavingGallery(true);
    setError(null);
    try {
      await patchVendor({ heroGalleryUrls: urls });
      setHeroGalleryUrls(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSavingGallery(false);
    }
  };

  const handleHeroVideoChange = async (id: string) => {
    setSavingHeroVideo(true);
    setError(null);
    try {
      await patchVendor({ heroVideoId: id || null });
      setHeroVideoId(id || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSavingHeroVideo(false);
    }
  };

  const handleThemeChange = async (theme: StorefrontTheme) => {
    setSavingTheme(true);
    setError(null);
    try {
      await patchVendor({ storefrontTheme: theme });
      setStorefrontTheme(theme);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSavingTheme(false);
    }
  };

  const currentFields = {
    name,
    description,
    location,
    phone,
    whatsapp,
    ownerName,
    ownerPhone,
    ownerEmail,
    showOwnerName,
    showOwnerPhone,
    showOwnerEmail,
    displayMode,
  };

  const dirty = (Object.keys(currentFields) as (keyof typeof currentFields)[]).some(
    (key) => currentFields[key] !== savedFields[key]
  );

  const discardChanges = () => {
    setName(savedFields.name);
    setDescription(savedFields.description);
    setLocation(savedFields.location);
    setPhone(savedFields.phone);
    setWhatsapp(savedFields.whatsapp);
    setOwnerName(savedFields.ownerName);
    setOwnerPhone(savedFields.ownerPhone);
    setOwnerEmail(savedFields.ownerEmail);
    setShowOwnerName(savedFields.showOwnerName);
    setShowOwnerPhone(savedFields.showOwnerPhone);
    setShowOwnerEmail(savedFields.showOwnerEmail);
    setDisplayMode(savedFields.displayMode);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await patchVendor({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        phone: phone.trim(),
        personalWhatsappNumber: whatsapp.trim() || null,
        ownerName: ownerName.trim() || null,
        ownerPhone: ownerPhone.trim() || null,
        ownerEmail: ownerEmail.trim() || null,
        showOwnerName,
        showOwnerPhone,
        showOwnerEmail,
        storefrontDisplayMode: displayMode,
      });
      // New baseline — the Save bar disappears because there is genuinely
      // nothing left unsaved, not because a timer ran out.
      setSavedFields(currentFields);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const { vendor: updated } = await patchVendor({ storefrontPublished: !published });
      setPublished(updated.storefrontPublished);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {/* Publish */}
      <div className="p-4 rounded-[var(--rl)] flex items-center justify-between gap-4" style={{ background: published ? "var(--green-bg)" : "var(--bg2)", border: `1px solid ${published ? "var(--green)" : "var(--bds)"}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: published ? "var(--green)" : "var(--bg3)", color: published ? "white" : "var(--tx3)" }}>
            <Rocket size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
              {published ? "Your storefront is live" : "Your storefront isn't published yet"}
            </p>
            {published ? (
              <a href={`/${vendor.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1" style={{ color: "var(--ac)" }}>
                booktns.com/{vendor.slug} <ExternalLink size={11} />
              </a>
            ) : (
              <p className="text-xs" style={{ color: "var(--tx3)" }}>Preview it from the dashboard, then publish when you&apos;re ready</p>
            )}
          </div>
        </div>
        <Button variant={published ? "secondary" : "primary"} size="sm" loading={publishing} onClick={handleTogglePublish} className="flex-shrink-0">
          {published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {/* Sub-tabs. The Storefront tab had grown into one ~570-line scroll
          covering branding, the home page layout, business details and
          opening hours — four unrelated jobs a vendor almost never does in
          the same sitting. The state stays in this one component (and so
          does the single save bar below) because the text fields and the
          display mode share one dirty check; only what's rendered changes. */}
      <div className="flex items-center gap-1 p-1 rounded-[var(--r)] overflow-x-auto" style={{ background: "var(--bg2)" }}>
        {STOREFRONT_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setSection(section.key)}
            className="px-3 py-1.5 rounded-[var(--r)] text-xs font-medium whitespace-nowrap transition-colors"
            style={
              section.key === activeSection
                ? { background: "var(--bg)", color: "var(--tx)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--tx2)" }
            }
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === "branding" && (
        <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>
            Logo <AutoSaveBadge />
          </label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={18} style={{ color: "var(--tx3)" }} />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="secondary" size="sm" loading={savingLogo} onClick={() => setShowLogoPicker(true)} className="w-fit">
                {logoUrl ? "Change logo" : "Choose logo"}
              </Button>
              {logoUrl && (
                <button type="button" onClick={() => handleLogoChange(undefined)} className="text-xs text-left" style={{ color: "var(--tx3)" }}>
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>
            Cover image <AutoSaveBadge />
          </label>
          <div className="w-full aspect-[3/1] rounded-[var(--r)] overflow-hidden flex items-center justify-center" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus size={20} style={{ color: "var(--tx3)" }} />
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="sm" loading={savingCover} onClick={() => setShowCoverPicker(true)} className="w-fit">
              {coverImageUrl ? "Change cover image" : "Choose cover image"}
            </Button>
            {coverImageUrl && (
              <button type="button" onClick={() => handleCoverChange(undefined)} className="text-xs" style={{ color: "var(--tx3)" }}>
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>
            Storefront color <AutoSaveBadge />
          </label>
          <div className="flex gap-3">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                disabled={savingTheme}
                onClick={() => handleThemeChange(t)}
                className="flex flex-col items-center gap-1.5 disabled:opacity-60"
                aria-label={t}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: STOREFRONT_THEMES[t].light,
                    outline: storefrontTheme === t ? "2px solid var(--tx)" : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                >
                  {storefrontTheme === t && <Check size={14} color="white" />}
                </span>
                <span className="text-xs" style={{ color: "var(--tx3)" }}>{t}</span>
              </button>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeSection === "home" && (
        <div className="flex flex-col gap-5">

        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>
            Hero card <AutoSaveBadge />
          </label>
          <div className="flex flex-col gap-2">
            {HERO_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={savingHeroMode}
                onClick={() => handleHeroModeChange(opt.value)}
                className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left disabled:opacity-60"
                style={{
                  background: heroCardMode === opt.value ? "var(--ac-bg)" : "var(--bg2)",
                  border: `1px solid ${heroCardMode === opt.value ? "var(--ac)" : "var(--bds)"}`,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: heroCardMode === opt.value ? "var(--ac)" : "var(--bd)",
                    background: heroCardMode === opt.value ? "var(--ac)" : "transparent",
                  }}
                >
                  {heroCardMode === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{opt.label}</p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {heroCardMode === "Gallery" && (
            <div className="flex flex-col gap-2 pl-1">
              {heroGalleryUrls.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {heroGalleryUrls.map((url) => (
                    <div key={url} className="relative aspect-square rounded-[var(--r)] overflow-hidden" style={{ background: "var(--bg3)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover object-top" />
                      <button
                        type="button"
                        onClick={() => handleGalleryChange(heroGalleryUrls.filter((u) => u !== url))}
                        className="absolute top-1 right-1 p-1 rounded-full"
                        style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
                        aria-label="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="secondary" size="sm" loading={savingGallery} onClick={() => setShowGalleryPicker(true)} className="w-fit">
                <Plus size={13} />
                Add photos
              </Button>
            </div>
          )}

          {heroCardMode === "Video" && (
            <div className="pl-1">
              {initialVideos.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  You haven&apos;t added any videos yet — <Link href="/dashboard/videos" className="underline">add one</Link> to use it here.
                </p>
              ) : (
                <select
                  value={heroVideoId ?? ""}
                  disabled={savingHeroVideo}
                  onChange={(e) => handleHeroVideoChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)] disabled:opacity-60"
                  style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                >
                  <option value="">Choose a video…</option>
                  {initialVideos.map((v) => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Home page display</label>
          <div className="flex flex-col gap-2">
            {DISPLAY_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDisplayMode(opt.value)}
                className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left"
                style={{
                  background: displayMode === opt.value ? "var(--ac-bg)" : "var(--bg2)",
                  border: `1px solid ${displayMode === opt.value ? "var(--ac)" : "var(--bds)"}`,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: displayMode === opt.value ? "var(--ac)" : "var(--bd)",
                    background: displayMode === opt.value ? "var(--ac)" : "transparent",
                  }}
                >
                  {displayMode === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{opt.label}</p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeSection === "details" && (
        <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 pt-2">
          <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Business details</p>
          <ManualSaveBadge />
        </div>

        <Input label="Business name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Storefront URL slug"
          value={vendor.slug}
          disabled
          hint={`booktns.com/${vendor.slug} — contact support to change this`}
        />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input
          label="Contact phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          hint="Shown on your storefront as the shop's number"
        />
        {/* Moved here from the Payment tab — this is the number customers
            message about a booking or order, which has nothing to do with
            how they pay. */}
        <Input
          label="WhatsApp number"
          type="tel"
          placeholder="024 412 3456"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          hint="Where the 'Message us on WhatsApp' buttons send customers. Leave blank to use your contact phone."
        />

        <div className="flex flex-col gap-4 p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Owner details</p>
            <p className="text-xs mt-1" style={{ color: "var(--tx3)" }}>
              Your own name and contact, separate from the business contact above. Tick a
              detail to show it in your storefront footer — anything left unticked is saved
              for your records but never sent to the storefront.
            </p>
            {ownerName.trim() && showOwnerName && (
              <p className="text-xs mt-2 italic" style={{ color: "var(--tx2)" }}>
                Customers will see: &ldquo;{name.trim() || vendor.name} is owned by {ownerName.trim()}&rdquo;
              </p>
            )}
          </div>

          <OwnerDetailField
            label="Owner name"
            placeholder="e.g. Akosua Mensah"
            value={ownerName}
            onValueChange={setOwnerName}
            shown={showOwnerName}
            onShownChange={setShowOwnerName}
          />
          <OwnerDetailField
            label="Owner phone"
            type="tel"
            placeholder="e.g. 024 412 3456"
            value={ownerPhone}
            onValueChange={setOwnerPhone}
            shown={showOwnerPhone}
            onShownChange={setShowOwnerPhone}
          />
          <OwnerDetailField
            label="Owner email"
            type="email"
            placeholder="e.g. rose@example.com"
            value={ownerEmail}
            onValueChange={setOwnerEmail}
            shown={showOwnerEmail}
            onShownChange={setShowOwnerEmail}
          />
        </div>
        </div>
      )}

      {activeSection === "hours" && (
      <div className="pt-6" style={{ borderTop: "1px solid var(--bd)" }}>
        <BusinessHoursCard initialHours={businessHours} />
      </div>
      )}

      {/* Outside the section switch on purpose: the fields it saves live on
          two different sections, and a vendor who edits Details, flips to
          Home page and then leaves must still be prompted. It hides itself
          when nothing is dirty. */}
        <UnsavedChangesBar
          dirty={dirty}
          saving={saving}
          justSaved={saved}
          onSave={handleSave}
          onDiscard={discardChanges}
        />

      {showLogoPicker && (
        <MediaPickerModal
          selectedUrls={logoUrl ? [logoUrl] : []}
          maxSelectable={1}
          onClose={() => setShowLogoPicker(false)}
          onConfirm={(urls) => handleLogoChange(urls[0])}
        />
      )}
      {showCoverPicker && (
        <MediaPickerModal
          selectedUrls={coverImageUrl ? [coverImageUrl] : []}
          maxSelectable={1}
          onClose={() => setShowCoverPicker(false)}
          onConfirm={(urls) => handleCoverChange(urls[0])}
        />
      )}
      {showGalleryPicker && (
        <MediaPickerModal
          selectedUrls={heroGalleryUrls}
          maxSelectable={6}
          onClose={() => setShowGalleryPicker(false)}
          onConfirm={(urls) => handleGalleryChange([...new Set([...heroGalleryUrls, ...urls])].slice(0, 6))}
        />
      )}
    </div>
  );
}


interface DnsInstruction {
  type: "A" | "CNAME";
  host: string;
  value: string;
}

interface DomainInfo {
  domain: string | null;
  verified: boolean;
  instructions: DnsInstruction[];
}

function DomainTab() {
  const [info, setInfo] = useState<DomainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const fetchDomain = async () => {
    try {
      setInfo(await apiBrowser<DomainInfo>("/vendor/domain"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load domain settings.");
    }
  };

  useEffect(() => {
    fetchDomain().finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!domainInput.trim()) return;
    setAdding(true);
    setError(null);
    try {
      setInfo(await apiBrowser<DomainInfo>("/vendor/domain", { method: "POST", body: { domain: domainInput.trim() } }));
      setDomainInput("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that domain. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    setError(null);
    try {
      await fetchDomain();
    } finally {
      setChecking(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    try {
      await apiBrowser("/vendor/domain", { method: "DELETE" });
      setInfo({ domain: null, verified: false, instructions: [] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove that domain. Please try again.");
    } finally {
      setConfirmingRemove(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ac-bg)" }}
        >
          <Globe size={16} style={{ color: "var(--ac)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--tx2)" }}>
          Point your own domain at your storefront — customers see a clean URL like
          yourshop.com instead of the free booktns link.
        </p>
      </div>

      {error && (
        <div
          className="px-3 py-2 rounded-[var(--r)] text-sm mb-4"
          style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--tx3)" }}>Loading…</p>
      ) : !info?.domain ? (
        <div className="flex gap-2">
          <Input
            placeholder="yourshop.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            className="flex-1"
          />
          <Button loading={adding} onClick={handleAdd} disabled={!domainInput.trim()}>
            Connect domain
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className="flex items-center justify-between p-4 rounded-[var(--rl)]"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            <div className="flex items-center gap-3">
              {info.verified ? (
                <ShieldCheck size={18} style={{ color: "var(--green)" }} />
              ) : (
                <AlertTriangle size={18} style={{ color: "var(--amber)" }} />
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{info.domain}</p>
                <p className="text-xs mt-0.5" style={{ color: info.verified ? "var(--green)" : "var(--amber)" }}>
                  {info.verified ? "Connected and live" : "Not verified yet"}
                </p>
              </div>
            </div>
            {info.verified && (
              <a href={`https://${info.domain}`} target="_blank" rel="noreferrer" style={{ color: "var(--tx3)" }}>
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          {!info.verified && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
                DNS records to add
              </p>
              {info.instructions.map((ins) => (
                <div
                  key={`${ins.type}-${ins.host}`}
                  className="p-3 rounded-[var(--r)]"
                  style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
                >
                  <div className="flex items-center gap-2 text-xs mb-1.5" style={{ color: "var(--tx3)" }}>
                    <span className="font-semibold">{ins.type}</span>
                    <span>·</span>
                    <span>{ins.host}</span>
                  </div>
                  {ins.value ? (
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-xs break-all" style={{ color: "var(--tx2)" }}>{ins.value}</p>
                      <CopyButton text={ins.value} />
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--tx3)" }}>
                      Domain setup is still being finished on our end — check back soon.
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs" style={{ color: "var(--tx3)" }}>
                DNS changes can take a while to propagate. Recheck once you&apos;ve added these records.
              </p>
              <Button variant="secondary" size="sm" loading={checking} onClick={handleRecheck} className="w-fit">
                Recheck
              </Button>
            </div>
          )}

          <Button variant="danger" size="sm" onClick={() => setConfirmingRemove(true)} className="w-fit">
            Remove domain
          </Button>
        </div>
      )}

      {confirmingRemove && (
        <ConfirmDialog
          title="Remove custom domain"
          message={`Remove "${info?.domain}"? Your storefront will go back to its free booktns URL.`}
          confirmLabel="Remove"
          danger
          onConfirm={handleRemove}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}
    </div>
  );
}


interface BookingTabProps {
  vendor: Vendor;
}

function BookingTab({ vendor }: BookingTabProps) {
  const [savedFields, setSavedFields] = useState({
    depositType: vendor.depositSetting,
    depositAmount:
      vendor.depositSetting === "Fixed" ? String((vendor.depositValue ?? 0) / 100) : String(vendor.depositValue ?? 50),
    policy: vendor.cancellationPolicy ?? "",
  });
  const [depositType, setDepositType] = useState(savedFields.depositType);
  const [depositAmount, setDepositAmount] = useState(savedFields.depositAmount);
  const [policy, setPolicy] = useState(savedFields.policy);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFields = { depositType, depositAmount, policy };
  const dirty = (Object.keys(currentFields) as (keyof typeof currentFields)[]).some(
    (key) => currentFields[key] !== savedFields[key]
  );

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const depositValue =
      depositType === "None" ? null : depositType === "Fixed" ? Math.round(parseFloat(depositAmount) * 100) || 0 : parseInt(depositAmount) || 0;

    try {
      await apiBrowser("/vendor", {
        method: "PATCH",
        body: { depositSetting: depositType, depositValue, cancellationPolicy: policy.trim() || null },
      });
      setSavedFields(currentFields);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--tx)" }}>
          Deposit requirement
          <ManualSaveBadge />
        </p>
        <div className="flex flex-col gap-2">
          {(["None", "Fixed", "Percentage"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setDepositType(type)}
              className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left"
              style={{
                background: depositType === type ? "var(--ac-bg)" : "var(--bg2)",
                border: `1px solid ${depositType === type ? "var(--ac)" : "var(--bds)"}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: depositType === type ? "var(--ac)" : "var(--bd)",
                  background: depositType === type ? "var(--ac)" : "transparent",
                }}
              >
                {depositType === type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                  {type === "None" ? "No deposit" : type === "Fixed" ? "Fixed amount" : "Percentage"}
                </p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  {type === "None"
                    ? "Customers pay in full on arrival"
                    : type === "Fixed"
                    ? "Require a fixed deposit per booking"
                    : "Require a % of the booking total"}
                </p>
              </div>
            </button>
          ))}
        </div>
        {depositType !== "None" && (
          <div className="mt-3">
            <Input
              label={depositType === "Fixed" ? "Deposit amount (GH₵)" : "Deposit percentage (%)"}
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
        )}
      </div>
      <Textarea
        label="Cancellation policy"
        value={policy}
        onChange={(e) => setPolicy(e.target.value)}
        rows={4}
      />
      <UnsavedChangesBar
        dirty={dirty}
        saving={loading}
        justSaved={saved}
        onSave={handleSave}
        onDiscard={() => {
          setDepositType(savedFields.depositType);
          setDepositAmount(savedFields.depositAmount);
          setPolicy(savedFields.policy);
          setError(null);
        }}
      />
    </div>
  );
}

interface CalendarTabProps {
  calendarFeedUrl: string;
}

interface ShareTabProps {
  vendor: Vendor;
  storefrontOrigin: string;
  services: Service[];
}

interface ShareRowProps {
  label: string;
  sublabel?: string;
  url: string;
  vendorName: string;
}

// One shareable link: the URL itself, copy, open, and a WhatsApp hand-off —
// WhatsApp being how a Ghanaian salon actually sends a customer a link.
function ShareRow({ label, sublabel, url, vendorName }: ShareRowProps) {
  const whatsappText = encodeURIComponent(`Book with ${vendorName}: ${url}`);

  return (
    <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>{label}</p>
          {sublabel && <p className="text-xs" style={{ color: "var(--tx3)" }}>{sublabel}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share ${label} on WhatsApp`}
            className="flex items-center justify-center w-7 h-7 rounded-[6px]"
            style={{ background: "var(--green-bg)", color: "var(--green)" }}
          >
            <MessageCircle size={13} />
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${label}`}
            className="flex items-center justify-center w-7 h-7 rounded-[6px]"
            style={{ background: "var(--bg3)", color: "var(--tx2)" }}
          >
            <ExternalLink size={13} />
          </a>
          <CopyButton text={url} />
        </div>
      </div>
      <p className="text-xs font-mono truncate" style={{ color: "var(--tx3)" }}>{url}</p>
    </div>
  );
}

// The public, customer-facing link — deliberately a separate tab from the
// Calendar feed next door, which is the vendor's own private subscription.
// Putting a "share this everywhere" link and a "never share this" link on
// one screen is how the wrong one gets posted.
function ShareTab({ vendor, storefrontOrigin, services }: ShareTabProps) {
  const bookingUrl = `${storefrontOrigin}/${vendor.slug}/book`;

  return (
    <div className="max-w-xl">
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ac-bg)" }}
        >
          <Share2 size={16} style={{ color: "var(--ac)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--tx2)" }}>
          Put this link in your Instagram bio, WhatsApp status, or a reply to a customer — it opens
          your calendar so they can pick a time and book themselves. No account needed on their side.
        </p>
      </div>

      {!vendor.storefrontPublished && (
        <div className="flex items-start gap-2.5 p-3 rounded-[var(--r)] mb-5" style={{ background: "var(--amber-bg)" }}>
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--amber)" }} />
          <p className="text-xs" style={{ color: "var(--amber)" }}>
            Your storefront isn&apos;t published yet, so this link won&apos;t open for anyone but you.
            Publish it from the Storefront tab before sharing.
          </p>
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
        Your booking link
      </p>
      <div className="mb-6">
        <ShareRow label="Book any service" sublabel="Opens the full booking flow" url={bookingUrl} vendorName={vendor.name} />
      </div>

      {/* The same link, in the form you hand to someone standing in front of
          you rather than paste into a chat. */}
      <div className="mb-6">
        <QrCodeCard slug={vendor.slug} vendorName={vendor.name} published={vendor.storefrontPublished} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--tx3)" }}>
        Straight to one service
      </p>
      <p className="text-xs mb-3" style={{ color: "var(--tx3)" }}>
        These skip the service picker — the customer lands on your calendar with that service already
        chosen. Useful when you&apos;re replying to someone asking about one specific thing.
      </p>
      {services.length === 0 ? (
        <div
          className="flex flex-col items-center gap-1 py-8 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>No services yet</p>
          <p className="text-xs" style={{ color: "var(--tx3)" }}>
            <Link href="/dashboard/services" className="underline">Add a service</Link> and it&apos;ll get its own link here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((service) => (
            <ShareRow
              key={service.id}
              label={service.name}
              sublabel={`${formatPrice(service.priceInPesewas)} · ${formatDuration(service.durationMinutes)}`}
              url={`${bookingUrl}?service=${service.id}`}
              vendorName={vendor.name}
            />
          ))}
        </div>
      )}

      <p className="text-xs mt-5" style={{ color: "var(--tx3)" }}>
        Shared in WhatsApp, Instagram, or X, these links unfurl into a preview card with your logo,
        cover photo, and what you offer — nothing extra to set up.
      </p>
    </div>
  );
}

function CalendarTab({ calendarFeedUrl }: CalendarTabProps) {
  return (
    <div className="max-w-xl">
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ac-bg)" }}
        >
          <CalendarDays size={16} style={{ color: "var(--ac)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--tx2)" }}>
          Subscribe to your bookings from your own Google Calendar (or Apple/Outlook) — this is separate from
          anything customers see, purely for keeping track of your own schedule.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 mb-6">
        {CALENDAR_SYNC_BENEFITS.map((item) => (
          <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
            <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--green)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{item.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
        Your calendar link
      </p>
      <div
        className="flex items-center gap-2 p-3 rounded-[var(--r)] mb-4"
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <p className="flex-1 text-xs truncate" style={{ color: "var(--tx2)" }}>{calendarFeedUrl}</p>
        <CopyButton text={calendarFeedUrl} />
      </div>

      <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
          How to add this to Google Calendar
        </p>
        <ol className="text-sm flex flex-col gap-1.5 list-decimal list-inside" style={{ color: "var(--tx2)" }}>
          <li>Copy the link above</li>
          <li>Open Google Calendar on desktop</li>
          <li>Next to &quot;Other calendars,&quot; click + → &quot;From URL&quot;</li>
          <li>Paste the link and click &quot;Add calendar&quot;</li>
        </ol>
        <p className="text-xs mt-3" style={{ color: "var(--tx3)" }}>
          Keep this link private — anyone who has it can see your upcoming bookings. Google typically refreshes
          subscribed calendars every few hours, not instantly.
        </p>
      </div>
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="max-w-xl">
      <p className="text-sm mb-4" style={{ color: "var(--tx2)" }}>
        Connected WhatsApp numbers receive booking notifications and can manage bookings via the bot.
      </p>
      <div className="flex flex-col gap-3 mb-6">
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--ac)" }}
          >
            R
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Akosua Mensah</p>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>+233241234567 · Owner</p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)" }}
            title="Connected"
          />
        </div>
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--green)" }}
          >
            F
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Fatima Mahama</p>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>+233201234567 · Management</p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)" }}
            title="Connected"
          />
        </div>
      </div>
      <Button variant="secondary" size="sm">+ Add WhatsApp number</Button>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="max-w-xl">
      {/* Current plan */}
      <div
        className="p-5 rounded-[var(--rl)] mb-6"
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--tx3)" }}>
              Current Plan
            </p>
            <p
              className="font-display text-2xl font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              Starter
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "var(--green-bg)", color: "var(--green)" }}
          >
            Active
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: "var(--tx2)" }}>
          <span>GH₵ 99 / month</span>
          <span>·</span>
          <span>Next billing: <span style={{ color: "var(--tx)" }}>Aug 1, 2025</span></span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm">Upgrade Plan</Button>
          <Button variant="ghost" size="sm">Manage Billing</Button>
        </div>
      </div>

      {/* Billing history */}
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>Billing History</p>
      <div
        className="rounded-[var(--rl)] overflow-hidden"
        style={{ border: "1px solid var(--bds)" }}
      >
        <div
          className="grid grid-cols-4 gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{ background: "var(--bg2)", color: "var(--tx3)" }}
        >
          <span>Date</span>
          <span>Plan</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
        <div className="flex flex-col gap-0.5 p-2" style={{ background: "var(--bg)" }}>
          {BILLING_HISTORY.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 px-3 py-3 rounded-lg hover:bg-[var(--bg2)] transition-colors items-center">
              <span className="text-sm" style={{ color: "var(--tx2)" }}>{row.date}</span>
              <span className="text-sm" style={{ color: "var(--tx)" }}>{row.plan}</span>
              <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{row.amount}</span>
              <span
                className="text-xs font-medium px-2 py-1 rounded-full w-fit"
                style={{ background: "var(--green-bg)", color: "var(--green)" }}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupportTab() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiBrowser("/support", { method: "POST", body: { subject: subject.trim(), message: message.trim() } });
      setSubject("");
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <p className="text-sm" style={{ color: "var(--tx2)" }}>
        Having trouble with your dashboard, or found something that looks wrong? Send us a message and we&apos;ll get back to you.
      </p>
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}
      <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" />
      <Textarea
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        placeholder="Tell us what's happening…"
      />
      <Button
        loading={loading}
        disabled={!subject.trim() || !message.trim()}
        onClick={handleSend}
        className="w-fit"
      >
        {sent ? <><Check size={14} /> Sent</> : "Send Message"}
      </Button>
      <div className="pt-4" style={{ borderTop: "1px solid var(--bds)" }}>
        <PlatformCredit />
      </div>
    </div>
  );
}

interface SettingsClientProps {
  vendor: Vendor;
  businessHours: BusinessHours[];
  initialVideos: VendorVideo[];
  calendarFeedUrl: string;
  // Absolute origin the vendor's customers should use — their verified
  // custom domain when they have one, the platform domain otherwise.
  // Resolved server-side so this component never has to reason about it.
  storefrontOrigin: string;
  services: Service[];
  verificationApplication: VerificationApplication | null;
}

export default function SettingsClient({ vendor, businessHours, initialVideos, calendarFeedUrl, storefrontOrigin, services, verificationApplication }: SettingsClientProps) {
  const [tab, setTab] = useState<SettingsTab>("storefront");

  return (
    <div>
      <Topbar title="Settings" />

      {/* Tab nav */}
      <div
        className="flex overflow-x-auto gap-1 p-1 rounded-[var(--r)] mb-6 w-fit max-w-full"
        style={{ background: "var(--bg2)" }}
      >
        {VISIBLE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-[var(--r)] text-sm font-medium transition-all whitespace-nowrap"
            style={
              tab === t.key
                ? { background: "var(--bg)", color: "var(--tx)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "var(--tx3)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "storefront" && <StorefrontTab vendor={vendor} businessHours={businessHours} initialVideos={initialVideos} />}
      {tab === "domain" && <DomainTab />}
      {tab === "verification" && (
        <VerificationTab status={vendor.verificationStatus} application={verificationApplication} />
      )}
      {tab === "booking" && <BookingTab vendor={vendor} />}
      {tab === "share" && <ShareTab vendor={vendor} storefrontOrigin={storefrontOrigin} services={services} />}
      {tab === "calendar" && <CalendarTab calendarFeedUrl={calendarFeedUrl} />}
      {tab === "whatsapp" && <WhatsAppTab />}
      {tab === "billing" && <BillingTab />}
      {tab === "support" && <SupportTab />}
    </div>
  );
}
