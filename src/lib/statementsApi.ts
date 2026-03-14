import { apiFetch, getToken } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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

function qs(startDate: string, endDate: string, format?: "csv") {
  const q = new URLSearchParams();
  q.set("startDate", startDate);
  q.set("endDate", endDate);
  if (format) q.set("format", format);
  return q.toString();
}

async function downloadCsv(path: string, startDate: string, endDate: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}?${qs(startDate, endDate, "csv")}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to download statement (${res.status})`);
  }
  return res.blob();
}

export function getMyLoanStatement(startDate: string, endDate: string) {
  return apiFetch<ProductStatement>(`/v1/statements/myloans?${qs(startDate, endDate)}`);
}
export function downloadMyLoanStatementCsv(startDate: string, endDate: string) {
  return downloadCsv("/v1/statements/myloans", startDate, endDate);
}

export function getMyFundTransfersStatement(startDate: string, endDate: string) {
  return apiFetch<ProductStatement>(`/v1/statements/myfundtransfers?${qs(startDate, endDate)}`);
}
export function downloadMyFundTransfersStatementCsv(startDate: string, endDate: string) {
  return downloadCsv("/v1/statements/myfundtransfers", startDate, endDate);
}

