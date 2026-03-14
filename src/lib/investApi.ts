import { apiFetch, getToken } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type InvestmentProductKey =
  | "LONG_TERM"
  | "SHORT_TERM"
  | "RETIREMENT"
  | "LEGACY"
  | "CHILDREN_FUTURE";

export type InvestmentProduct = {
  id: string;
  key: InvestmentProductKey;
  name: string;
  description?: string | null;
  annualRatePct: number;
  minMonths: number;
  maxMonths: number;
  currency: string;
  isActive: boolean;
  effectiveAnnualRatePct?: number;
  hasUserOverride?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type InvestmentPlanSnapshot = {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | string;
  productId: string;
  productKey: InvestmentProductKey;
  productName: string;
  currency: string;
  monthlyContribution: number;
  durationMonths: number;
  annualRatePct: number;
  startDate: string;
  createdAt: string;
  monthsElapsed: number;
  monthsRemaining: number;
  progressPct: number;
  totalContributed: number;
  currentBalance: number;
  growthToDate: number;
  projectedMaturityValue: number;
  projectedTotalGrowth: number;
};

export type InvestDashboardResponse = {
  products: Array<{
    id: string;
    key: InvestmentProductKey;
    name: string;
    annualRatePct: number;
    currency: string;
  }>;
  productBalances: Array<{
    productId: string;
    productKey: InvestmentProductKey;
    productName: string;
    annualRatePct: number;
    currency: string;
    currentBalance: number;
    totalContributed: number;
    plansCount: number;
    activePlans: number;
  }>;
  summary: {
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    totalContributed: number;
    currentBalance: number;
    projectedMaturityValue: number;
  };
  plans: InvestmentPlanSnapshot[];
};

export type InvestReportsResponse = {
  months: number;
  trend: Array<{
    month: string;
    contributed: number;
    growth: number;
    plansCreated: number;
  }>;
  productPlanMix: Array<{
    productKey: InvestmentProductKey;
    productName: string;
    plansCount: number;
    currentBalance: number;
  }>;
};

export function getInvestProducts() {
  return apiFetch<{ items: InvestmentProduct[] }>("/v1/invest/products");
}

export function createInvestPlan(payload: {
  productId: string;
  name: string;
  monthlyContribution: number;
  durationMonths: number;
}) {
  return apiFetch<{ plan: InvestmentPlanSnapshot }>("/v1/invest/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listInvestPlans() {
  return apiFetch<{ items: InvestmentPlanSnapshot[] }>("/v1/invest/plans");
}

export function getInvestDashboard() {
  return apiFetch<InvestDashboardResponse>("/v1/invest/dashboard");
}

export function getInvestReports(months = 6) {
  return apiFetch<InvestReportsResponse>(`/v1/invest/reports?months=${months}`);
}

export function listAdminInvestProducts() {
  return apiFetch<{ items: InvestmentProduct[] }>("/v1/admin/invest/products");
}

export function createAdminInvestProduct(payload: {
  key: InvestmentProductKey;
  name: string;
  description?: string;
  annualRatePct: number;
  minMonths: number;
  maxMonths: number;
  currency?: string;
  isActive?: boolean;
}) {
  return apiFetch<{ product: InvestmentProduct }>("/v1/admin/invest/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminInvestProduct(productId: string, payload: Partial<InvestmentProduct>) {
  return apiFetch<{ product: InvestmentProduct }>(`/v1/admin/invest/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type InvestmentUserRate = {
  id: string;
  userId: string;
  productId: string;
  annualRatePct: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    key: InvestmentProductKey;
    name: string;
    annualRatePct: number;
    currency: string;
  };
};

export function listAdminInvestUserRates(userId: string) {
  return apiFetch<{ items: InvestmentUserRate[] }>(`/v1/admin/invest/user-rates?userId=${encodeURIComponent(userId)}`);
}

export function upsertAdminInvestUserRate(payload: {
  userId: string;
  productId: string;
  annualRatePct: number;
  isActive?: boolean;
}) {
  return apiFetch<{ item: InvestmentUserRate }>("/v1/admin/invest/user-rates", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function downloadMyInvestmentStatementCsv(startDate: string, endDate: string) {
  const qs = new URLSearchParams();
  qs.set("startDate", startDate);
  qs.set("endDate", endDate);
  qs.set("format", "csv");

  const token = getToken();
  const res = await fetch(`${API_BASE}/v1/statements/myinvestment?${qs.toString()}`, {
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

export type InvestmentStatement = {
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
  rows: Array<{
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
  }>;
};

export function getMyInvestmentStatement(startDate: string, endDate: string) {
  const qs = new URLSearchParams();
  qs.set("startDate", startDate);
  qs.set("endDate", endDate);
  return apiFetch<InvestmentStatement>(`/v1/statements/myinvestment?${qs.toString()}`);
}
