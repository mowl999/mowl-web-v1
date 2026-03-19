import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getMe, type Me } from "@/lib/api";
import {
  getTrustHistory,
  getUserDashboard,
  type DashboardPlan,
  type TrustHistoryItem,
  type UserDashboard,
} from "@/lib/dashboardApi";
import { listContributions, type Contribution } from "@/lib/contributionsApi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatMoney(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function addMonths(baseIso: string, months: number) {
  const d = new Date(baseIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d;
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

type TimelineStatus = "PAID" | "LATE" | "MISSED" | "PAUSED" | "PENDING" | "DUE" | "UPCOMING";

function timelineBadge(status: TimelineStatus) {
  if (status === "PAID") return <Badge className="bg-emerald-600 hover:bg-emerald-600">PAID</Badge>;
  if (status === "LATE") return <Badge variant="secondary">LATE</Badge>;
  if (status === "MISSED") return <Badge variant="destructive">MISSED</Badge>;
  if (status === "PAUSED") return <Badge variant="secondary">PAUSED</Badge>;
  if (status === "PENDING") return <Badge variant="secondary">PENDING</Badge>;
  if (status === "DUE") return <Badge className="bg-amber-600 hover:bg-amber-600">DUE NOW</Badge>;
  return <Badge variant="outline">UPCOMING</Badge>;
}

export default function MyContributionsDashboard() {
  const [data, setData] = useState<UserDashboard | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [trustHistory, setTrustHistory] = useState<TrustHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [scenarioMonthly, setScenarioMonthly] = useState("500");
  const [scenarioGoals, setScenarioGoals] = useState("1");

  const [timelineItems, setTimelineItems] = useState<Contribution[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const plans = useMemo(() => data?.plans || [], [data]);
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );

  async function loadDashboard() {
    setLoading(true);
    try {
      const [dashRes, meRes, trustRes] = await Promise.all([
        getUserDashboard(),
        getMe(),
        getTrustHistory(6),
      ]);
      setData(dashRes);
      setMe(meRes);
      setTrustHistory(trustRes.items || []);
      if (!selectedPlanId && dashRes.plans.length > 0) {
        setSelectedPlanId(dashRes.plans[0].id);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load MyContributions dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeline(planId: string) {
    setTimelineLoading(true);
    try {
      const res = await listContributions(planId);
      setTimelineItems(res.items || []);
    } catch (e: any) {
      setTimelineItems([]);
      toast.error(e?.message || "Failed to load contribution timeline");
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPlan?.id) loadTimeline(selectedPlan.id);
  }, [selectedPlan?.id]);

  const selectedPlanMeta = useMemo(() => {
    if (!selectedPlan) return null;
    const payoutMonth = selectedPlan.you.payoutCycleIndex + 1;
    const finalMonth = selectedPlan.memberCount;
    const byCycle = new Map<number, Contribution>();
    for (const c of timelineItems) byCycle.set(c.cycleIndex, c);

    let nextDueMonth: number | null = null;
    for (let idx = 0; idx < finalMonth; idx += 1) {
      const existing = byCycle.get(idx);
      const settled = existing && (existing.status === "PAID" || existing.status === "LATE");
      if (!settled) {
        nextDueMonth = idx + 1;
        break;
      }
    }

    const nextDueDate =
      nextDueMonth == null || selectedPlan.currentCycleIndex >= selectedPlan.memberCount
        ? null
        : addMonths(selectedPlan.createdAt, nextDueMonth - 1);

    return { payoutMonth, finalMonth, nextDueMonth, nextDueDate };
  }, [selectedPlan, timelineItems]);

  const timelineRows = useMemo(() => {
    if (!selectedPlan) return [];
    const byCycle = new Map<number, Contribution>();
    for (const c of timelineItems) byCycle.set(c.cycleIndex, c);

    const rows = Array.from({ length: selectedPlan.memberCount }, (_, idx) => {
      const monthNumber = idx + 1;
      const existing = byCycle.get(idx);
      let status: TimelineStatus = "UPCOMING";

      if (existing) {
        status = (existing.status as TimelineStatus) || "PENDING";
      } else if (idx === selectedPlan.currentCycleIndex && selectedPlan.currentCycleIndex < selectedPlan.memberCount) {
        status = "DUE";
      } else if (idx < selectedPlan.currentCycleIndex) {
        status = "PENDING";
      }

      return {
        monthNumber,
        dueDate: fmtDate(addMonths(selectedPlan.createdAt, idx)),
        status,
      };
    });

    let upcomingSeen = 0;
    return rows.filter((row) => {
      if (row.status !== "UPCOMING") return true;
      upcomingSeen += 1;
      return upcomingSeen <= 3;
    });
  }, [selectedPlan, timelineItems]);

  const affordabilityPreview = useMemo(() => {
    const monthly = Number(scenarioMonthly || 0);
    const goals = Number(scenarioGoals || 0);
    const current = Number(me?.affordability?.currentMonthlyCommitment || 0);
    const cap = Number(me?.affordability?.maxMonthlyExposure || 0);
    if (!Number.isFinite(monthly) || !Number.isFinite(goals)) return null;
    const additional = Number((monthly * goals).toFixed(2));
    const projectedTotal = Number((current + additional).toFixed(2));
    const remainingAfter = Number((cap - projectedTotal).toFixed(2));
    return {
      additional,
      projectedTotal,
      remainingAfter,
      withinCap: projectedTotal <= cap,
    };
  }, [me?.affordability?.currentMonthlyCommitment, me?.affordability?.maxMonthlyExposure, scenarioGoals, scenarioMonthly]);

  const trustChartMax = useMemo(() => {
    if (trustHistory.length === 0) return 100;
    return Math.max(100, ...trustHistory.map((x) => Number(x.trustScore || 0)));
  }, [trustHistory]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-sky-100 bg-sky-50/30 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MyContributions Dashboard</h1>
            <p className="text-sm text-slate-500">
            Plan your payout month and track monthly contribution obligations for each financial plan.
            </p>
          </div>
          <Button variant="outline" onClick={loadDashboard} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
          <CardContent className="p-6 text-sm text-muted-foreground">Loading dashboard...</CardContent>
        </Card>
      ) : plans.length === 0 ? (
        <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
          <CardHeader>
            <CardTitle className="text-base">No financial plan yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Create your first financial plan from the Plans tab to see payout projection and timeline.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
            <CardHeader>
              <CardTitle className="text-base">Select Financial Plan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <Button
                  key={p.id}
                  variant={selectedPlan?.id === p.id ? "default" : "outline"}
                  onClick={() => setSelectedPlanId(p.id)}
                >
                  {p.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          {selectedPlan && selectedPlanMeta ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Projected Payout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-semibold">Month {selectedPlanMeta.payoutMonth}</div>
                    <div className="text-xs text-muted-foreground">
                      At your assigned position ({selectedPlan.assignedPosition}), projected payout is{" "}
                      {formatMoney(
                        selectedPlan.memberCount *
                          selectedPlan.contributionAmount *
                          (1 + Number(selectedPlan.positionInterestRate || 0)),
                        selectedPlan.currency
                      )}
                      .
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Contribution Window</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-semibold">Continue until month {selectedPlanMeta.finalMonth}</div>
                    <div className="text-xs text-muted-foreground">
                      Keep paying monthly through the final month.
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Upcoming Due Date</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-semibold">
                      {selectedPlan.currentCycleIndex >= selectedPlan.memberCount
                        ? "Completed"
                        : selectedPlanMeta.nextDueDate
                        ? fmtDate(selectedPlanMeta.nextDueDate)
                        : "Awaiting cycle close"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Next contribution month: {selectedPlanMeta.nextDueMonth ?? "—"}.
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Trust Score</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-semibold">{data?.reputation?.trustScore?.toFixed?.(2) ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      Level: {data?.reputation?.trustLevel ?? "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
                <CardHeader>
                  <CardTitle className="text-base">Trust Trend (Month-to-Month)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trustHistory.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No trust history yet.</div>
                  ) : (
                    trustHistory.map((t) => {
                      const w = Math.max(4, Math.round((Number(t.trustScore || 0) / trustChartMax) * 100));
                      return (
                        <div key={t.month} className="space-y-1 rounded-xl border border-sky-100 bg-white p-3">
                          <div className="flex items-center justify-between text-xs">
                            <div className="font-medium">{t.month}</div>
                            <div className={t.changeFromPrevious >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              {t.changeFromPrevious >= 0 ? "+" : ""}
                              {t.changeFromPrevious}
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-sky-100">
                            <div className="h-2 rounded-full bg-sky-500" style={{ width: `${w}%` }} />
                          </div>
                          <div className="text-xs text-slate-600">
                            Trust score: <span className="font-medium">{t.trustScore.toFixed(2)}</span> ({t.trustLevel})
                          </div>
                          <div className="text-xs text-slate-500">
                            {t.reasons.slice(0, 2).join(" ")}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
                <CardHeader>
                  <CardTitle className="text-base">Affordability Preview (Plan Scenario)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">Monthly contribution per new plan</div>
                      <input
                        className="h-10 w-full rounded-lg border border-sky-200 bg-white px-3 text-sm"
                        value={scenarioMonthly}
                        onChange={(e) => setScenarioMonthly(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">Number of new plans</div>
                      <input
                        className="h-10 w-full rounded-lg border border-sky-200 bg-white px-3 text-sm"
                        value={scenarioGoals}
                        onChange={(e) => setScenarioGoals(e.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-sky-100 bg-white p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Current committed</span>
                      <span>{formatMoney(Number(me?.affordability?.currentMonthlyCommitment || 0), selectedPlan?.currency || "GBP")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Additional from scenario</span>
                      <span>{formatMoney(Number(affordabilityPreview?.additional || 0), selectedPlan?.currency || "GBP")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Projected total monthly</span>
                      <span>{formatMoney(Number(affordabilityPreview?.projectedTotal || 0), selectedPlan?.currency || "GBP")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Cap (trust-adjusted)</span>
                      <span>{formatMoney(Number(me?.affordability?.maxMonthlyExposure || 0), selectedPlan?.currency || "GBP")}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-sky-100 pt-2">
                      <span className="text-slate-500">Remaining after scenario</span>
                      <span className={Number(affordabilityPreview?.remainingAfter || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {formatMoney(Number(affordabilityPreview?.remainingAfter || 0), selectedPlan?.currency || "GBP")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Result: {affordabilityPreview?.withinCap ? "Within affordability limit." : "Exceeds affordability limit."}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm dashboard-card">
                <CardHeader>
                  <CardTitle className="text-base">Contribution Status Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {timelineLoading ? (
                    <div className="text-sm text-muted-foreground">Loading timeline...</div>
                  ) : (
                    timelineRows.map((row) => (
                      <div
                        key={row.monthNumber}
                        className="flex items-center justify-between rounded-xl border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">Month {row.monthNumber}</div>
                          <div className="text-xs text-muted-foreground">Due: {row.dueDate}</div>
                        </div>
                        {timelineBadge(row.status)}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
