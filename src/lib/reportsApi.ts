import { apiFetch, getToken } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type ReportRange = "7d" | "30d" | "90d" | "all";

export type MyContributionsReport = {
  range: ReportRange;
  generatedAt: string;
  totals: {
    plans: number;
    contributionsPaid: number;
    contributionsPending: number;
    contributionsLate: number;
    contributionsMissed: number;
    contributedAmount: number;
    payoutsSent: number;
    payoutsPending: number;
    payoutsAmountSent: number;
    approvedSwaps: number;
    swapFeesCharged: number;
  };
  plans: Array<{
    planId: string;
    planName: string;
    status: string;
    currency: string;
    assignedPosition: number;
    currentCycle: number;
    memberCount: number;
    monthlyContribution: number;
    contributionsPaid: number;
    contributionsPending: number;
    contributionsLate: number;
    contributionsMissed: number;
    contributedAmount: number;
    payoutsSent: number;
    payoutsPending: number;
    payoutsAmountSent: number;
    approvedSwaps: number;
    swapFeesCharged: number;
  }>;
};

export function getMyContributionsReport(range: ReportRange = "30d", planId?: string) {
  const qs = new URLSearchParams();
  qs.set("range", range);
  if (planId) qs.set("planId", planId);
  return apiFetch<MyContributionsReport>(`/v1/reports/mycontributions?${qs.toString()}`);
}

export async function downloadMyContributionsStatementCsv(startDate: string, endDate: string) {
  const qs = new URLSearchParams();
  qs.set("startDate", startDate);
  qs.set("endDate", endDate);
  qs.set("format", "csv");

  const token = getToken();
  const res = await fetch(`${API_BASE}/v1/statements/mycontributions?${qs.toString()}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to download statement (${res.status})`);
  }
  return res.blob();
}

export type StatementRow = {
  date: string;
  product: string;
  activityType: string;
  reference: string;
  planId: string;
  planName: string;
  direction: "DEBIT" | "CREDIT" | string;
  amount: number;
  currency: string;
  description: string;
  runningBalance: number;
};

export type ProductStatement = {
  product: string;
  period: { startDate: string; endDate: string };
  generatedAt: string;
  summary: {
    totalCredits: number;
    totalDebits: number;
    net: number;
    openingBalance: number;
    closingBalance: number;
  };
  rows: StatementRow[];
};

export function getMyContributionsStatement(startDate: string, endDate: string) {
  const qs = new URLSearchParams();
  qs.set("startDate", startDate);
  qs.set("endDate", endDate);
  return apiFetch<ProductStatement>(`/v1/statements/mycontributions?${qs.toString()}`);
}
