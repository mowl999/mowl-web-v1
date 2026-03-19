import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getMyContributionsReport,
  type MyContributionsReport,
  type ReportRange,
} from "@/lib/reportsApi";
import { listPlans, type Plan } from "@/lib/plansApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function toCsv(report: MyContributionsReport) {
  const headers = [
    "Plan",
    "Status",
    "Position",
    "Cycle",
    "Paid",
    "Pending",
    "Late",
    "Missed",
    "ContributedAmount",
    "PayoutsSent",
    "PayoutsPending",
    "PayoutsAmountSent",
    "ApprovedSwaps",
    "SwapFeesCharged",
    "Currency",
  ];
  const rows = report.plans.map((p) => [
    p.planName,
    p.status,
    String(p.assignedPosition),
    `${p.currentCycle}/${p.memberCount}`,
    String(p.contributionsPaid),
    String(p.contributionsPending),
    String(p.contributionsLate),
    String(p.contributionsMissed),
    String(p.contributedAmount),
    String(p.payoutsSent),
    String(p.payoutsPending),
    String(p.payoutsAmountSent),
    String(p.approvedSwaps),
    String(p.swapFeesCharged),
    p.currency,
  ]);
  return [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("30d");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [report, setReport] = useState<MyContributionsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, reportRes] = await Promise.all([
        listPlans(null, 100),
        getMyContributionsReport(range, planFilter === "ALL" ? undefined : planFilter),
      ]);
      setPlans(plansRes.items || []);
      setReport(reportRes);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [range, planFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const reportCurrency = useMemo(() => report?.plans?.[0]?.currency || "GBP", [report?.plans]);

  function exportCsv() {
    if (!report) return;
    const csv = toCsv(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mycontributions-report-${report.range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">MyContributions Reports</h1>
        <p className="text-sm text-slate-500">Track contributions, payouts, and swap monetization by period.</p>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap items-end gap-1.5">
            <Select value={range} onValueChange={(v) => setRange(v as ReportRange)}>
              <SelectTrigger className="h-10 w-[136px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7d</SelectItem>
                <SelectItem value="30d">Last 30d</SelectItem>
                <SelectItem value="90d">Last 90d</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-10 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All plans</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-10 px-4" variant="outline" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button className="h-10 px-4" onClick={exportCsv} disabled={!report || loading}>
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contributed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(report?.totals.contributedAmount || 0, reportCurrency)}</div>
            <div className="text-xs text-muted-foreground">
              Paid: {report?.totals.contributionsPaid || 0} • Late: {report?.totals.contributionsLate || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contribution Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{report?.totals.contributionsPending || 0}</div>
            <div className="text-xs text-muted-foreground">Missed: {report?.totals.contributionsMissed || 0}</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Payouts Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{report?.totals.payoutsSent || 0}</div>
            <div className="text-xs text-muted-foreground">
              Amount: {formatMoney(report?.totals.payoutsAmountSent || 0, reportCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Swap Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(report?.totals.swapFeesCharged || 0, reportCurrency)}</div>
            <div className="text-xs text-muted-foreground">Approved swaps: {report?.totals.approvedSwaps || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Per-plan Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : !report || report.plans.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No report data for this filter.</div>
          ) : (
            <div className="divide-y">
              {report.plans.map((p) => (
                <div key={p.planId} className="p-4 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{p.planName}</div>
                    <div className="text-xs text-muted-foreground">
                      Position {p.assignedPosition} • Cycle {p.currentCycle}/{p.memberCount}
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3 lg:grid-cols-6">
                    <div>Paid: <span className="font-medium">{p.contributionsPaid}</span></div>
                    <div>Pending: <span className="font-medium">{p.contributionsPending}</span></div>
                    <div>Late: <span className="font-medium">{p.contributionsLate}</span></div>
                    <div>Missed: <span className="font-medium">{p.contributionsMissed}</span></div>
                    <div>Payout sent: <span className="font-medium">{p.payoutsSent}</span></div>
                    <div>Swap fees: <span className="font-medium">{formatMoney(p.swapFeesCharged, p.currency)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
