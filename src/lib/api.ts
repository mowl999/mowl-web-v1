// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const TOKEN_KEY = "token";
const REMEMBER_KEY = "rememberMe";

/* =====================================================
   Auth token helpers
===================================================== */

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string, remember = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, "1");
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(REMEMBER_KEY, "0");
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

/* =====================================================
   Core fetch helper
===================================================== */

export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const readErrorMessage = async () => {
    const text = await res.text().catch(() => "");
    try {
      const json = text ? JSON.parse(text) : null;
      return json?.error?.message || text || `Request failed: ${res.status}`;
    } catch {
      return text || `Request failed: ${res.status}`;
    }
  };

  if (res.status === 401) {
    const err: any = new Error(await readErrorMessage());
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const err: any = new Error(await readErrorMessage());
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;

  return (await res.json()) as T;
}

/* =====================================================
   Pattern 1: /v1/auth/me
===================================================== */

export type ProductKey = "THRIFT" | "INVEST" | "LOANS" | "FUND_TRANSFERS" | "ADMIN";

export type Me = {
  id: string;
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  monthlyIncome?: number | null;
  monthlyExpenses?: number | null;
  otherMonthlyEarnings?: number | null;
  state?: string;
  role?: string;
  entitlements: ProductKey[];
  products?: ProductKey[];
  affordability?: {
    hasIncomeProfile?: boolean;
    hasFinancialProfile: boolean;
    limitPct: number;
    baseLimitPct?: number;
    trustFactor?: number;
    trustScore?: number;
    trustLevel?: "HIGH" | "MEDIUM" | "LOW" | string;
    creditScore?: number;
    penaltiesTotal?: number;
    currentMonthlyCommitment: number;
    monthlyDisposable: number | null;
    maxMonthlyExposure: number | null;
    remainingMonthlyCapacity: number | null;
    yearlyIncomeEstimate: number | null;
    yearlyDisposableEstimate: number | null;
  };
};

export function getMe() {
  return apiFetch<Me>("/v1/auth/me");
}

export type UpdateFinancialProfilePayload = {
  monthlyIncome: number;
  monthlyExpenses: number;
  otherMonthlyEarnings?: number;
};

export function updateFinancialProfile(payload: UpdateFinancialProfilePayload) {
  return apiFetch<{ ok: boolean; affordability?: any; user?: any }>("/v1/auth/financial-profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

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
  status: string; // PlanStatus from backend, keep string for now
  memberCount: number;
  contributionAmount: number;
  currency: string;
  assignedPosition: number;
  swapsUsed: number;
  currentCycleIndex: number;
  createdAt: string;

  you: {
    position: number | null;
    payoutCycleIndex: number;
  };

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
