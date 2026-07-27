// E.164 phone normalisation. No country field exists on Vendor/customer input
// today, so a bare local-format number (e.g. "0244123456") is assumed to be
// Ghana — matching the app's GHS/pesewas pricing model, the only concrete
// signal available for which country's numbers this app primarily serves.
// A number that already includes a country code (leading "+" or "00") is
// respected as-is regardless of country.
const DEFAULT_COUNTRY_CODE = "233";

// Returns the number in E.164 form (e.g. "+233244123456"), or null if the
// input doesn't look like a plausible phone number at all.
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let normalized: string;
  if (hasPlus) {
    normalized = digits;
  } else if (digits.startsWith("00")) {
    normalized = digits.slice(2);
  } else if (digits.startsWith("0")) {
    normalized = DEFAULT_COUNTRY_CODE + digits.slice(1);
  } else {
    normalized = digits;
  }

  if (normalized.length < 8 || normalized.length > 15) return null;

  return `+${normalized}`;
}
