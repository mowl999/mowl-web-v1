import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getMe, type Me, updateFinancialProfile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function formatMoney(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function IncomeProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [otherMonthlyEarnings, setOtherMonthlyEarnings] = useState("");

  const currency = "GBP";

  async function load() {
    setLoading(true);
    try {
      const res = await getMe();
      setMe(res);
      setMonthlyIncome(
        res?.monthlyIncome != null && Number.isFinite(Number(res.monthlyIncome))
          ? String(res.monthlyIncome)
          : ""
      );
      setMonthlyExpenses(
        res?.monthlyExpenses != null && Number.isFinite(Number(res.monthlyExpenses))
          ? String(res.monthlyExpenses)
          : ""
      );
      setOtherMonthlyEarnings(
        res?.otherMonthlyEarnings != null && Number.isFinite(Number(res.otherMonthlyEarnings))
          ? String(res.otherMonthlyEarnings)
          : "0"
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to load income profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const preview = useMemo(() => {
    const income = Number(monthlyIncome);
    const expenses = Number(monthlyExpenses);
    const other = Number(otherMonthlyEarnings || 0);
    if (!Number.isFinite(income) || !Number.isFinite(expenses) || !Number.isFinite(other)) return null;
    const monthlyDisposable = income + other - expenses;
    const pct = Number(me?.affordability?.limitPct || 0.6);
    const maxAllowedMonthly = monthlyDisposable * pct;
    return {
      monthlyDisposable,
      yearlyIncomeEstimate: (income + other) * 12,
      yearlyDisposableEstimate: monthlyDisposable * 12,
      maxAllowedMonthly,
    };
  }, [monthlyIncome, monthlyExpenses, otherMonthlyEarnings, me?.affordability?.limitPct]);
  const trustScore = Number(me?.affordability?.trustScore || 0);
  const trustLabel = trustScore <= 0 ? "NEW" : me?.affordability?.trustLevel ?? "—";

  async function onSave() {
    const income = Number(monthlyIncome);
    const expenses = Number(monthlyExpenses);
    const other = Number(otherMonthlyEarnings || 0);

    if (!Number.isFinite(income) || income <= 0) {
      return toast.error("Monthly income must be greater than 0.");
    }
    if (!Number.isFinite(expenses) || expenses < 0) {
      return toast.error("Monthly expenses must be 0 or higher.");
    }
    if (!Number.isFinite(other) || other < 0) {
      return toast.error("Other monthly earnings must be 0 or higher.");
    }

    setSaving(true);
    try {
      await updateFinancialProfile({
        monthlyIncome: income,
        monthlyExpenses: expenses,
        otherMonthlyEarnings: other,
      });
      toast.success("Income profile updated.");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update income profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Affordability Summary</h1>
          <p className="text-sm text-slate-500">
            Income profile + trust score drive your affordability limits during goal creation.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Affordability and Trust Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3">
              <div className="text-xs text-slate-500">Trust score</div>
              <div className="text-lg font-semibold">{trustScore.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3">
              <div className="text-xs text-slate-500">Trust level</div>
              <div className="text-lg font-semibold">{trustLabel}</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3">
              <div className="text-xs text-slate-500">Cap percentage</div>
              <div className="text-lg font-semibold">
                {(Number(me?.affordability?.limitPct || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current committed monthly</span>
            <span className="font-medium">
              {me?.affordability?.currentMonthlyCommitment != null
                ? formatMoney(me.affordability.currentMonthlyCommitment, currency)
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Max allowed monthly</span>
            <span className="font-medium">
              {me?.affordability?.maxMonthlyExposure != null
                ? formatMoney(me.affordability.maxMonthlyExposure, currency)
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remaining monthly capacity</span>
            <span className="font-semibold">
              {me?.affordability?.remainingMonthlyCapacity != null
                ? formatMoney(me.affordability.remainingMonthlyCapacity, currency)
                : "—"}
            </span>
          </div>
          {preview ? (
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3 mt-2">
              <div className="text-xs text-muted-foreground">
                Preview from current input values (before save)
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Yearly income estimate</span>
                <span>{formatMoney(preview.yearlyIncomeEstimate, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Yearly disposable estimate</span>
                <span>{formatMoney(preview.yearlyDisposableEstimate, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max allowed monthly (preview)</span>
                <span>{formatMoney(preview.maxAllowedMonthly, currency)}</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">User Profile Management</CardTitle>
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Hide Update Form" : "Update Income Profile"}
          </Button>
        </CardHeader>
        {editing ? (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Monthly income</Label>
                <Input
                  inputMode="decimal"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-1">
                <Label>Monthly expenses</Label>
                <Input
                  inputMode="decimal"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(e.target.value)}
                  placeholder="2000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Other monthly earnings (optional)</Label>
              <Input
                inputMode="decimal"
                value={otherMonthlyEarnings}
                onChange={(e) => setOtherMonthlyEarnings(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save Income Profile"}
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="text-sm text-slate-500">
            Income profile inputs are hidden by default. Use “Update Income Profile” when you need to make changes.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
