import { apiFetch } from "@/lib/api";

export type TrustLevel = "HIGH" | "MEDIUM" | "LOW";

export type DashboardUser = {
  id: string;
  email: string;
  fullName: string;
  state: string;
  role: string;
};

export type DashboardReputation = {
  creditScore: number;
  trustScore: number;
  trustLevel: TrustLevel;
  penaltiesTotal: number;
  accountAgeMonths: number;
};

export type DashboardPlan = {
  id: string;
  name: string;
  status: string;
  memberCount: number;
  contributionAmount: number;
  effectiveMonthlyContribution?: number;
  positionInterestRate?: number;
  currency: string;
  assignedPosition: number;
  swapsUsed: number;
  currentCycleIndex: number;
  createdAt: string;
  you: { position: number | null; payoutCycleIndex: number };
  nextPayout: null | {
    cycleIndex: number;
    recipientPosition: number;
    recipientName: string | null;
    recipientType: string | null;
    potAmount: number;
  };
};

export type UserDashboard = {
  user: DashboardUser;
  reputation: DashboardReputation;
  plans: DashboardPlan[];
};

export function getUserDashboard() {
  return apiFetch<UserDashboard>("/v1/dashboard/user");
}

export type TrustHistoryItem = {
  month: string;
  paidCount: number;
  lateCount: number;
  missedCount: number;
  creditsEarned: number;
  penaltyCount: number;
  penaltiesTotal: number;
  creditScoreEnd: number;
  trustScore: number;
  trustLevel: TrustLevel;
  changeFromPrevious: number;
  reasons: string[];
};

export type TrustHistoryResponse = {
  months: number;
  items: TrustHistoryItem[];
};

export function getTrustHistory(months = 6) {
  return apiFetch<TrustHistoryResponse>(`/v1/dashboard/trust-history?months=${months}`);
}
