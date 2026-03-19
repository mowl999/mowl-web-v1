import type { ComponentType } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { AdminLoanEquityPayment } from "@/lib/adminLoansApi";
import type { LoanApplication, LoanProduct } from "@/lib/loansApi";

export function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border shadow-sm dashboard-card">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
          <div className="text-xs text-slate-500">{hint}</div>
        </div>
        <div className="rounded-xl border border-white/80 bg-indigo-50 p-2.5 shadow-sm">
          <Icon className="h-5 w-5 text-indigo-700" />
        </div>
      </CardContent>
    </Card>
  );
}

export function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function loanStatusTone(status: LoanApplication["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  if (status === "MORE_INFO_REQUIRED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "SUBMITTED") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (status === "DRAFT") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function equityPaymentTone(status: AdminLoanEquityPayment["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

export type ProductFormState = {
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  minTermMonths: string;
  maxTermMonths: string;
  annualInterestRatePct: string;
  processingFeePct: string;
  equityRequirementPct: string;
  minimumEquityAmount: string;
  requiredDocuments: Array<
    "IDENTITY" | "EMPLOYMENT_EVIDENCE" | "BANK_STATEMENT" | "BUSINESS_PROOF" | "ADDRESS_PROOF" | "OTHER"
  >;
  isActive: boolean;
};

export function productToForm(product: LoanProduct): ProductFormState {
  return {
    name: product.name,
    description: product.description || "",
    minAmount: String(product.minAmount),
    maxAmount: String(product.maxAmount),
    minTermMonths: String(product.minTermMonths),
    maxTermMonths: String(product.maxTermMonths),
    annualInterestRatePct: String(Number(product.annualInterestRatePct || 0) * 100),
    processingFeePct: String(Number(product.processingFeePct || 0) * 100),
    equityRequirementPct: String(Number(product.equityRequirementPct || 0) * 100),
    minimumEquityAmount: String(product.minimumEquityAmount || 0),
    requiredDocuments: product.requiredDocuments || [],
    isActive: product.isActive,
  };
}

export function emptyProductForm(): ProductFormState {
  return {
    name: "",
    description: "",
    minAmount: "1000",
    maxAmount: "10000",
    minTermMonths: "3",
    maxTermMonths: "12",
    annualInterestRatePct: "18",
    processingFeePct: "1",
    equityRequirementPct: "20",
    minimumEquityAmount: "0",
    requiredDocuments: ["IDENTITY", "BANK_STATEMENT"],
    isActive: true,
  };
}
