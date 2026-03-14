import { apiFetch } from "@/lib/api";

export type PaymentMethodCode = "CARD" | "PAY_BY_BANK" | "DIRECT_DEBIT" | "BANK_TRANSFER_MANUAL";

export type PlanPaymentOption = {
  code: PaymentMethodCode;
  label: string;
  description: string;
  submissionMode: "GATEWAY" | "BANK_TRANSFER" | "UNAVAILABLE";
  availableNow: boolean;
};

export type PlanPaymentOptionsResponse = {
  planId: string;
  countryCode: string;
  currency: string;
  methods: PlanPaymentOption[];
};

export function getPlanPaymentOptions(planId: string) {
  return apiFetch<PlanPaymentOptionsResponse>(`/v1/plans/${planId}/payment-options`);
}
