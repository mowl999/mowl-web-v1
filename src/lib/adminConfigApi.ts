import { apiFetch } from "@/lib/api";

export type AdminRuleConfig = {
  id: string;
  version: number;
  currency: string;
  maxDisposableCommitmentPct: number;
  positionEarlyChargePct: number;
  positionLateCompensationPct: number;
  swapFactor: number;
  swapDiscountRate: number;
  feeFloorAmount: number;
  maxSwapsPerPlan: number;
  missedPaymentCredits: number;
  postPayoutMissedPenaltyMultiplier: number;
  contributionsCountryCode: string;
  contributionsEnabledPaymentMethods: Array<"CARD" | "PAY_BY_BANK" | "DIRECT_DEBIT" | "BANK_TRANSFER_MANUAL">;
  pauseFeatureEnabled: boolean;
  pauseFeePerMonth: number;
  maxPauseMonths: number;
  updatedAt: string;
};

export function getCurrentAdminRuleConfig() {
  return apiFetch<{ rule: AdminRuleConfig }>("/v1/admin/config/rules/current");
}

export function updateCurrentAdminRuleConfig(payload: Partial<AdminRuleConfig>) {
  return apiFetch<{ ok: boolean; message: string; rule: AdminRuleConfig }>("/v1/admin/config/rules/current", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
