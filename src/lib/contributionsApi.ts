import { apiFetch } from "@/lib/api";

export type ContributionStatus = "PENDING" | "PAID" | "LATE" | "MISSED" | string;

export type Contribution = {
  id: string;
  cycleIndex: number;
  amount: number;
  status: ContributionStatus;
  creditsAwarded: number;
  multiplierApplied: number;
  paymentRef: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type ListContributionsResponse = {
  planId: string;
  currency: string;
  items: Contribution[];
};

export type CreateContributionResponse = {
  planId: string;
  cycleIndex: number;
  contribution: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  };
  nextStep: string;
};

export function listContributions(planId: string, cycleIndex?: number) {
  const qs = new URLSearchParams();
  if (cycleIndex != null) qs.set("cycleIndex", String(cycleIndex));
  const q = qs.toString();

  return apiFetch<ListContributionsResponse>(
    `/v1/plans/${planId}/contributions${q ? `?${q}` : ""}`
  );
}

export function createContribution(planId: string) {
  // backend ignores amount and uses plan.contributionAmount + currentCycleIndex
  return apiFetch<CreateContributionResponse>(`/v1/plans/${planId}/contributions`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type ConfirmContributionPayload = {
  status: "PAID" | "LATE" | "MISSED";
  paymentRef?: string;
  paidAt?: string; // ISO string
};

export type ConfirmContributionResponse = {
  planId: string;
  cycleIndex: number;
  contribution: {
    id: string;
    status: string;
    amount: number;
    creditsAwarded: number;
    multiplierApplied: number;
    paymentRef: string | null;
    paidAt: string | null;
  };
  creditImpact:
    | { creditsAwarded: 0; note: string }
    | { creditsAwarded: number; balanceAfter: number };
};

export function confirmContribution(
  planId: string,
  contributionId: string,
  payload: ConfirmContributionPayload
) {
  return apiFetch<ConfirmContributionResponse>(
    `/v1/plans/${planId}/contributions/${contributionId}/confirm`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}
