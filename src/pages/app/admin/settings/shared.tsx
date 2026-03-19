import type { ComponentType, ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const PAYMENT_METHOD_OPTIONS = [
  ["CARD", "Card"],
  ["PAY_BY_BANK", "Pay by Bank"],
  ["DIRECT_DEBIT", "Direct Debit"],
  ["BANK_TRANSFER_MANUAL", "Manual Bank Transfer"],
] as const;

export function AdminSetupIntro({
  badge,
  title,
  description,
}: {
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
        {badge}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

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
        <div className="space-y-1.5">
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

export function RuleField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
