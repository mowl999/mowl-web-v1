import { apiFetch } from "@/lib/api";

export type ContributionPayment = {
  id: string;
  channel: "GATEWAY" | "BANK_TRANSFER";
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  amount: number;
  currency: string;
  providerRef?: string | null;
  userReference?: string | null;
  note?: string | null;
  reviewNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
};

export function submitGatewayPayment(
  planId: string,
  contributionId: string,
  payload: { providerRef?: string; note?: string } = {}
) {
  return apiFetch<{
    status: string;
    payment: ContributionPayment;
    contribution: {
      id: string;
      cycleIndex: number;
      status: string;
      amount: number;
      paymentRef: string | null;
      paidAt: string | null;
    };
  }>(`/v1/plans/${planId}/contributions/${contributionId}/payments/gateway`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitManualTransfer(
  planId: string,
  contributionId: string,
  payload: { userReference: string; note?: string; receiptUrl?: string }
) {
  return apiFetch<{
    status: string;
    message: string;
    payment: ContributionPayment;
  }>(`/v1/plans/${planId}/contributions/${contributionId}/payments/manual`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listContributionPayments(planId: string, contributionId: string) {
  return apiFetch<{ contributionId: string; items: ContributionPayment[] }>(
    `/v1/plans/${planId}/contributions/${contributionId}/payments`
  );
}

export type AdminPaymentItem = ContributionPayment & {
  reviewedById?: string | null;
  user: { id: string; email: string; fullName: string | null };
  contribution: {
    id: string;
    cycleIndex: number;
    status: string;
    paymentRef: string | null;
    paidAt: string | null;
  };
  plan: { id: string; name: string };
};

export function listAdminPayments(status: "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL" = "SUBMITTED") {
  return apiFetch<{ items: AdminPaymentItem[] }>(`/v1/admin/payments?status=${status}`);
}

export function reviewAdminPayment(
  paymentId: string,
  payload: { decision: "APPROVE" | "REJECT"; reviewNote?: string; paymentRef?: string }
) {
  return apiFetch<{ status: string; payment: AdminPaymentItem }>(`/v1/admin/payments/${paymentId}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

