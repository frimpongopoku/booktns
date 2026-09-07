import type { MobileNetwork } from "@/types";

export type { MobileNetwork };

// Ghana's three mobile money carriers, in the order a vendor would expect
// to scan them (by market share). Single source of truth for the dropdown
// options (Settings > Get paid) and the display label everywhere a payment
// method is shown to a customer (the /pay page, the booking flow's payment
// picker).
export const MOBILE_NETWORKS: MobileNetwork[] = ["MTN", "Telecel", "AirtelTigo"];

export const MOBILE_NETWORK_LABEL: Record<MobileNetwork, string> = {
  MTN: "MTN Mobile Money",
  Telecel: "Telecel Cash",
  AirtelTigo: "AirtelTigo Money",
};
