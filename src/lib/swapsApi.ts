import { apiFetch } from "@/lib/api";

export type SwapQuote = {
  planId: string;
  fromPosition: number;
  toPosition: number;
  steps: number;
  feeCharged: number;
  payoutImpact: {
    oldPayoutCycleIndex: number;
    newPayoutCycleIndex: number;
  };
  userMetrics: {
    trustLevel: string;
    trustScore: number;
  };
  canRequest: boolean;
};

export type SwapItem = {
  id: string;
  planId: string;
  userId?: string;
  fromPosition: number;
  toPosition: number;
  steps: number;
  feeCharged: number;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

export function getSwapQuote(planId: string, targetPosition: number) {
  return apiFetch<SwapQuote>(`/v1/plans/${planId}/swaps/quote`, {
    method: "POST",
    body: JSON.stringify({ targetPosition }),
  });
}

export function requestSwap(planId: string, targetPosition: number) {
  return apiFetch<{ status: string; swap: SwapItem; message: string }>(`/v1/plans/${planId}/swaps/request`, {
    method: "POST",
    body: JSON.stringify({ targetPosition }),
  });
}

export function listMySwaps(planId: string) {
  return apiFetch<{ items: SwapItem[] }>(`/v1/plans/${planId}/swaps`);
}

export type AdminSwapItem = SwapItem & {
  reviewedById?: string | null;
  user: { id: string; email: string; fullName: string | null };
  plan: {
    id: string;
    name: string;
    assignedPosition: number;
    currentCycleIndex: number;
  };
};

export type AdminSwapLedger = {
  range?: "7d" | "30d" | "all";
  totals: {
    totalFeesCollected: number;
    pendingExposure: number;
  };
  counts: {
    approvedSwaps: number;
    pendingSwaps: number;
    rejectedSwaps: number;
  };
};

export function listAdminSwaps(status: "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL" = "SUBMITTED") {
  return apiFetch<{ items: AdminSwapItem[] }>(`/v1/admin/swaps?status=${status}`);
}

export function getAdminSwapLedger() {
  return apiFetch<AdminSwapLedger>(`/v1/admin/swaps/ledger`);
}

export function getAdminSwapLedgerByRange(range: "7d" | "30d" | "all") {
  return apiFetch<AdminSwapLedger>(`/v1/admin/swaps/ledger?range=${range}`);
}

export function reviewAdminSwap(swapId: string, payload: { decision: "APPROVE" | "REJECT"; reviewNote?: string }) {
  return apiFetch<{ status: string; swap: AdminSwapItem }>(`/v1/admin/swaps/${swapId}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
