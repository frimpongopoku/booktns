import type { DepositSetting } from "../../types";

// Shared by the client-side estimate shown in the booking wizard's confirm
// step and the server-side authoritative calculation in POST /api/bookings —
// kept in one place so the two can't drift apart.
export function calculateDepositAmountPesewas(
  depositSetting: DepositSetting,
  depositValue: number | null | undefined,
  totalServicePesewas: number
): number {
  if (depositSetting === "Fixed") return depositValue ?? 0;
  if (depositSetting === "Percentage") return Math.round((totalServicePesewas * (depositValue ?? 0)) / 100);
  return 0;
}
