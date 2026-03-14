import { apiFetch } from "@/lib/api";

export type PauseOptions = {
  planId: string;
  currency: string;
  payoutCycleIndex: number;
  payoutCompleted: boolean;
  remainingContributionCycles: number;
  maxPauseMonths: number;
  pauseFeePerMonth: number;
  featureEnabled: boolean;
  maxRequestableMonths: number;
  hasActivePause: boolean;
  hasPendingPause: boolean;
  activePause?: PlanPause | null;
  pendingPause?: PlanPause | null;
  canRequest: boolean;
};

export type PlanPause = {
  id: string;
  planId: string;
  userId: string;
  startCycleIndex: number;
  endCycleIndex: number;
  months: number;
  feePerMonth: number;
  totalFee: number;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  paymentRef?: string | null;
  note?: string | null;
  reviewedById?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

export function getPauseOptions(planId: string) {
  return apiFetch<PauseOptions>(`/v1/plans/${planId}/pauses/options`);
}

export function listPlanPauses(planId: string) {
  return apiFetch<{ planId: string; items: PlanPause[] }>(`/v1/plans/${planId}/pauses`);
}

export function requestPlanPause(
  planId: string,
  payload: { months: number; paymentRef?: string; note?: string }
) {
  return apiFetch<{ status: string; pause: PlanPause; message: string }>(`/v1/plans/${planId}/pauses/request`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AdminPauseItem = PlanPause & {
  user: { id: string; email: string; fullName: string | null };
  plan: { id: string; name: string; currentCycleIndex: number; assignedPosition: number };
};

export function listAdminPauses(status: "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL" = "SUBMITTED") {
  return apiFetch<{ items: AdminPauseItem[] }>(`/v1/admin/pauses?status=${status}`);
}

export function reviewAdminPause(pauseId: string, payload: { decision: "APPROVE" | "REJECT"; reviewNote?: string }) {
  return apiFetch<{ status: string; pause: AdminPauseItem }>(`/v1/admin/pauses/${pauseId}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
