import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { Plan } from "@/lib/plansApi";
import { createPlan, listPlans } from "@/lib/plansApi";
import { listContributions } from "@/lib/contributionsApi";
import { getMe, type Me } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatMoney(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function pct(current: number, total: number) {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}

export default function GroupsPage() {
  const nav = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [settledProgressByPlan, setSettledProgressByPlan] = useState<Record<string, number>>({});
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [goalName, setGoalName] = useState("");
  const [durationMonths, setDurationMonths] = useState("12");
  const [monthlyContribution, setMonthlyContribution] = useState("5000");
  const [positionPreference, setPositionPreference] = useState(""); // optional
  const targetAmount = useMemo(() => {
    const m = Number(durationMonths);
    const c = Number(monthlyContribution);
    if (!Number.isFinite(m) || !Number.isFinite(c)) return 0;
    return m * c;
  }, [durationMonths, monthlyContribution]);
  const affordability = me?.affordability;
  const isProfileMissing = !(affordability?.hasIncomeProfile ?? affordability?.hasFinancialProfile);
  const isCapacityLow = (affordability?.remainingMonthlyCapacity ?? 0) <= 0;
  const shouldShowProfileAction = isProfileMissing || isCapacityLow;
  const projectedRemainingCapacity = useMemo(() => {
    const remaining = affordability?.remainingMonthlyCapacity;
    const monthly = Number(monthlyContribution || 0);
    if (remaining == null || !Number.isFinite(monthly)) return null;
    return Number((remaining - monthly).toFixed(2));
  }, [affordability?.remainingMonthlyCapacity, monthlyContribution]);
  const cannotAffordGoal = projectedRemainingCapacity != null && projectedRemainingCapacity < 0;

  const currency = useMemo(() => plans[0]?.currency || "GBP", [plans]);

  async function load() {
    setLoading(true);
    try {
      const [plansRes, meRes] = await Promise.all([listPlans(null, 20), getMe()]);
      setPlans(plansRes.items);
      setNextCursor(plansRes.nextCursor);
      setMe(meRes);
      const progressPairs = await Promise.all(
        plansRes.items.map(async (p) => {
          try {
            const res = await listContributions(p.id);
            const settledCount = (res.items || []).filter((c) => c.status === "PAID" || c.status === "LATE").length;
            return [p.id, settledCount] as const;
          } catch {
            return [p.id, 0] as const;
          }
        })
      );
      setSettledProgressByPlan(Object.fromEntries(progressPairs));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    try {
      const res = await listPlans(nextCursor, 20);
      setPlans((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      const progressPairs = await Promise.all(
        res.items.map(async (p) => {
          try {
            const contribRes = await listContributions(p.id);
            const settledCount = (contribRes.items || []).filter((c) => c.status === "PAID" || c.status === "LATE").length;
            return [p.id, settledCount] as const;
          } catch {
            return [p.id, 0] as const;
          }
        })
      );
      setSettledProgressByPlan((prev) => ({
        ...prev,
        ...Object.fromEntries(progressPairs),
      }));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load more plans");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setGoalName("");
    setDurationMonths("12");
    setMonthlyContribution("5000");
    setPositionPreference("");
  }

  async function onCreate() {
    const months = Number(durationMonths);
    const monthly = Number(monthlyContribution);
    const target = Number(targetAmount);
    const pref = positionPreference.trim() ? Number(positionPreference) : undefined;

    if (!goalName.trim()) return toast.error("Plan name is required.");
    if (!Number.isInteger(months) || months < 2 || months > 200) {
      return toast.error("Duration must be between 2 and 200 months.");
    }
    if (!Number.isFinite(monthly) || monthly <= 0) {
      return toast.error("Monthly contribution must be greater than 0.");
    }
    if (cannotAffordGoal) {
      return toast.error(
        "You cannot create this financial plan because remaining capacity is negative. Reduce the monthly contribution amount for this plan."
      );
    }
    if (pref !== undefined && (!Number.isFinite(pref) || pref < 1 || pref > months)) {
      return toast.error("Position preference must be between 1 and duration months.");
    }

    setSaving(true);
    try {
      // backend auto-selects latest RuleConfig and requires frequency MONTHLY
      const created = await createPlan({
        goalName: goalName.trim(),
        targetAmount: target,
        monthlyContribution: monthly,
        durationMonths: months,
        // `createPlan` helper sets frequency: "MONTHLY"
        ...(pref !== undefined ? { positionPreference: pref } : {}),
      });

      toast.success("Financial plan created");
      setOpen(false);
      resetForm();

      // reload list (so assigned position/swaps/etc show up consistently)
      await load();

      // go to plan details (we’ll build this page next)
      nav(`/app/thrift/goals/${created.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Failed to create financial plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">MyContributions Plans</h1>
          <p className="text-sm text-slate-500">Financial plans, contribution cycles, and payout positions</p>
        </div>

        <Button onClick={() => setOpen(true)}>Create plan</Button>
      </div>

      <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your Plans</CardTitle>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              There is no financial plan yet. Create your first plan.
            </div>
          ) : (
            <>
              <div className="divide-y">
                {plans.map((p) => {
                  const total = p.durationMonths ?? p.memberCount;
                  const settled = Math.min(settledProgressByPlan[p.id] ?? 0, total);
                  return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 p-4 hover:bg-sky-50/70 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 w-full sm:max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{p.name}</div>
                        <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>
                          {p.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Duration: {p.durationMonths ?? p.memberCount} months • Position: {p.assignedPosition} • Cashout month: {p.assignedPayoutMonth ?? p.assignedPosition}
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Progress</span>
                          <span>
                            {settled} / {total} contributions paid
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-sky-100">
                          <div
                            className="h-2 rounded-full bg-sky-500 transition-all"
                            style={{
                              width: `${pct(settled, total)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-sm font-semibold">
                      Target: {formatMoney(p.targetAmount ?? p.memberCount * p.contributionAmount, p.currency || currency)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="default" onClick={() => nav(`/app/thrift/goals/${p.id}`)}>
                        View plan details
                      </Button>
                      <Button variant="outline" onClick={() => nav(`/app/thrift/goals/${p.id}?tab=contributions`)}>
                        Contributions
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>

              {nextCursor && (
                <div className="p-4 flex justify-center">
                  <Button variant="outline" onClick={loadMore}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Group Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create financial plan</DialogTitle>
            <DialogDescription>
              Define your target amount and monthly contribution. Your payout position will be assigned automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan name</Label>
              <Input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. Home equity down payment"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  inputMode="numeric"
                  placeholder="12"
                />
              </div>

              <div className="space-y-2">
                <Label>Monthly contribution</Label>
                <Input
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  inputMode="decimal"
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target amount (auto)</Label>
              <Input value={targetAmount ? String(targetAmount) : ""} disabled />
              <div className="text-xs text-muted-foreground">
                Calculated as monthly contribution × duration.
              </div>
            </div>

            <Card className="rounded-xl border-sky-100 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Affordability Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-md border bg-white p-2">
                    <div className="text-[11px] text-slate-500">Trust score</div>
                    <div className="font-semibold">{affordability?.trustScore?.toFixed?.(2) ?? "—"}</div>
                  </div>
                  <div className="rounded-md border bg-white p-2">
                    <div className="text-[11px] text-slate-500">Trust level</div>
                    <div className="font-semibold">{affordability?.trustLevel ?? "—"}</div>
                  </div>
                  <div className="rounded-md border bg-white p-2">
                    <div className="text-[11px] text-slate-500">Active cap</div>
                    <div className="font-semibold">{(Number(affordability?.limitPct || 0) * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Max allowed monthly</span>
                  <span className="font-medium">
                    {affordability?.maxMonthlyExposure != null
                      ? formatMoney(affordability.maxMonthlyExposure, currency)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current committed</span>
                  <span className="font-medium">
                    {affordability?.currentMonthlyCommitment != null
                      ? formatMoney(affordability.currentMonthlyCommitment, currency)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Remaining capacity</span>
                  <span
                    className={`font-medium ${
                      (affordability?.remainingMonthlyCapacity ?? 0) < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {affordability?.remainingMonthlyCapacity != null
                      ? formatMoney(affordability.remainingMonthlyCapacity, currency)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-muted-foreground">
                    Remaining after this plan ({formatMoney(Number(monthlyContribution || 0), currency)}/month)
                  </span>
                  <span
                    className={`font-semibold ${
                      (projectedRemainingCapacity ?? 0) < 0 ? "text-red-600" : "text-foreground"
                    }`}
                  >
                    {projectedRemainingCapacity != null
                      ? formatMoney(projectedRemainingCapacity, currency)
                      : "—"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Exposure cap is {(Number(affordability?.limitPct || 0.6) * 100).toFixed(0)}% of monthly disposable income.
                </div>
                {cannotAffordGoal ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    You cannot create this financial plan because remaining capacity is negative. Reduce the monthly contribution amount for this plan.
                  </div>
                ) : null}
                {shouldShowProfileAction ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-2">
                    <div className="text-xs text-amber-800">
                      {isProfileMissing
                        ? "Your income profile is missing. Add it to calculate your affordability limit."
                        : "Your remaining capacity is low. Update income profile if your finances have changed."}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8"
                      onClick={() => nav("/app/thrift/affordability-summary")}
                    >
                      Update Income Profile
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Position preference (optional)</Label>
              <Input
                value={positionPreference}
                onChange={(e) => setPositionPreference(e.target.value)}
                inputMode="numeric"
                placeholder={`1 - ${Number(durationMonths) || 12}`}
              />
              <div className="text-xs text-muted-foreground">
                Optional hint. Final position is assigned automatically by the system.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={saving || cannotAffordGoal}>
                {saving ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
