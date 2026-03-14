// src/lib/planDetailsApi.ts
import { apiFetch } from "@/lib/api";

/* =====================================================
   Types (match backend summary + members exactly)
===================================================== */

export type MemberType = "REAL" | "VIRTUAL" | string;

export type PlanSummaryResponse = {
  plan: {
    id: string;
    name: string;
    status: string; // ACTIVE | COMPLETED | etc
    memberCount: number;
    contributionAmount: number;
    effectiveContributionAmount?: number;
    positionInterestRate?: number;
    currency: string;
    currentCycleIndex: number;
    createdAt: string;
  };
  you: {
    displayName: string;
    position: number | null;
    payoutCycleIndex: number;
    alreadyPaid: boolean;
  };
  nextPayout: null | {
    cycleIndex: number;
    recipientPosition: number;
    recipientType: MemberType | null;
    recipientName: string | null;
    potAmount: number;
  };
  stats: {
    payoutsCreated: number;
  };
};

export type PlanMember = {
  id: string;
  type: MemberType;
  displayName: string;
  position: number;
};

export type PlanMembersResponse = {
  planId: string;
  memberCount: number;
  assignedPosition: number;
  items: PlanMember[];
};

/* =====================================================
   API helpers
===================================================== */

export function getPlanSummary(planId: string) {
  return apiFetch<PlanSummaryResponse>(`/v1/plans/${planId}/summary`);
}

export function getPlanMembers(planId: string) {
  return apiFetch<PlanMembersResponse>(`/v1/plans/${planId}/members`);
}
