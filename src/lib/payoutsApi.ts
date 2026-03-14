import { apiFetch } from "@/lib/api";

export type PayoutStatus = "PENDING" | "SENT" | "CANCELLED" | string;
export type MemberType = "REAL" | "VIRTUAL" | string;

export type Payout = {
  id: string;
  cycleIndex: number;
  amount: number;
  currency: string;
  recipientPosition: number;
  recipientType: MemberType;
  recipientName: string;
  status: PayoutStatus;
  sentAt: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

export type ListPayoutsResponse = {
  planId: string;
  currency: string;
  items: Payout[];
};

export type CloseCycleResponse = {
  status: "CYCLE_CLOSED";
  planId: string;
  payout: {
    id: string;
    cycleIndex: number;
    amount: number;
    currency: string;
    recipientPosition: number;
    recipientType: MemberType;
    recipientName: string;
    status: PayoutStatus;
    sentAt: string | null;
    note: string | null;
  };
  nextCycleIndex: number;
};

export function closeCycle(planId: string) {
  return apiFetch<CloseCycleResponse>(`/v1/plans/${planId}/cycles/close`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listPayouts(planId: string) {
  return apiFetch<ListPayoutsResponse>(`/v1/plans/${planId}/payouts`);
}

export type MarkPayoutSentPayload = {
  reference?: string;
  note?: string;
  sentAt?: string; // ISO
};

export type MarkPayoutSentResponse = {
  status: "PAYOUT_MARKED_SENT";
  payout: {
    id: string;
    planId: string;
    cycleIndex: number;
    amount: number;
    currency: string;
    recipientName: string;
    recipientPosition: number;
    recipientType: MemberType;
    status: PayoutStatus;
    sentAt: string | null;
    reference: string | null;
    note: string | null;
  };
};

export function markPayoutSent(payoutId: string, payload: MarkPayoutSentPayload) {
  return apiFetch<MarkPayoutSentResponse>(`/v1/payouts/${payoutId}/mark-sent`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
