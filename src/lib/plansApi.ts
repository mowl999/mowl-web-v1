import { apiFetch } from "@/lib/api";

export type PlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "SUSPENDED";

export type Plan = {
  id: string;
  name: string;
  goalName?: string;
  status: PlanStatus;
  memberCount: number;
  durationMonths?: number;
  contributionAmount: number;
  monthlyContribution?: number;
  effectiveMonthlyContribution?: number;
  positionInterestRate?: number;
  targetAmount?: number;
  currency: string;
  frequency: "MONTHLY";
  assignedPosition: number;
  assignedPayoutMonth?: number;
  swapsUsed: number;
  currentCycleIndex: number;
  createdAt: string;
};

export type ListPlansResponse = {
  items: Plan[];
  nextCursor: string | null;
};

export type CreatePlanPayload = {
  goalName: string;
  targetAmount: number;
  monthlyContribution: number;
  durationMonths: number;
  frequency: "MONTHLY";
  positionPreference?: number; // optional (controller supports it)
};

export function listPlans(cursor?: string | null, limit = 20) {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", cursor);

  const q = qs.toString();
  return apiFetch<ListPlansResponse>(`/v1/plans${q ? `?${q}` : ""}`);
}

export function createPlan(payload: Omit<CreatePlanPayload, "frequency"> & { frequency?: "MONTHLY" }) {
  return apiFetch<Plan & { assignmentExplanation?: any }>(`/v1/plans`, {
    method: "POST",
    body: JSON.stringify({ ...payload, frequency: "MONTHLY" }),
  });
}
