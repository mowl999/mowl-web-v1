import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvestDashboardData, useInvestReportsData, formatMoney } from "./useInvestData";

const REPORT_CARDS = [
  {
    title: "Allocation Report",
    detail: "View distribution across long-term, short-term, retirement, legacy, and children plans.",
  },
  {
    title: "Performance Snapshot",
    detail: "Monitor plan-level progress against targets and contribution consistency.",
  },
  {
    title: "Goal Maturity Report",
    detail: "Track upcoming maturity windows and required actions for each plan.",
  },
  {
    title: "Risk & Rebalance Log",
    detail: "Review profile changes and previous rebalance decisions over time.",
  },
];

export default function InvestmentReportsPage() {
  const [months, setMonths] = useState<"1" | "3" | "6" | "12" | "24">("6");
  const { loading: loadingDash, error: errorDash, currency, reload: reloadDash } = useInvestDashboardData();
  const { data: reports, loading: loadingReports, error: errorReports, reload: reloadReports } = useInvestReportsData(
    Number(months)
  );

  const trend = reports?.trend || [];
  const totalContributed = trend.reduce((sum, row) => sum + Number(row.contributed || 0), 0);
  const totalGrowth = trend.reduce((sum, row) => sum + Number(row.growth || 0), 0);
  const plansCreated = trend.reduce((sum, row) => sum + Number(row.plansCreated || 0), 0);
  const loading = loadingDash || loadingReports;
  const loadError = errorDash || errorReports;

  function refresh() {
    reloadDash();
    reloadReports();
  }

  function exportCsv() {
    if (!reports) return;
    const headerA = ["Month", "Contributed", "Growth", "PlansCreated"];
    const trendRows = reports.trend.map((row) => [
      row.month,
      String(row.contributed || 0),
      String(row.growth || 0),
      String(row.plansCreated || 0),
    ]);
    const headerB = ["Product", "PlansCount", "CurrentBalance"];
    const mixRows = reports.productPlanMix.map((row) => [
      row.productName,
      String(row.plansCount || 0),
      String(row.currentBalance || 0),
    ]);
    const csv = [
      "Trend",
      headerA.join(","),
      ...trendRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      "",
      "Product Mix",
      headerB.join(","),
      ...mixRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `myinvestment-report-${months}m-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Investment Reports</h1>
        <p className="text-sm text-slate-500">Live summaries from your plans, growth, and product mix by period.</p>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap items-end gap-1.5">
            <Select value={months} onValueChange={(v) => setMonths(v as "1" | "3" | "6" | "12" | "24")}>
              <SelectTrigger className="h-10 w-[156px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 1 month</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-10 px-4" variant="outline" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
            <Button className="h-10 px-4" onClick={exportCsv} disabled={loading || !reports}>
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Contributed ({months}M)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {loading ? "..." : formatMoney(totalContributed, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Estimated Growth ({months}M)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {loading ? "..." : formatMoney(totalGrowth, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Plans Created ({months}M)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{loading ? "..." : plansCreated}</div>
          </CardContent>
        </Card>
      </div>

      {loadError && (
        <Card className="rounded-2xl border-red-100 bg-white shadow-sm">
          <CardContent className="p-4 text-sm text-red-600">{loadError}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {REPORT_CARDS.map((card, idx) => (
          <Card key={card.title} className="rounded-2xl border-indigo-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{card.detail}</p>
              {idx === 0 ? (
                <div className="mt-4 text-xs text-slate-600">
                  {loading ? (
                    "Loading product mix..."
                  ) : (
                    reports?.productPlanMix?.map((c) => `${c.productName}: ${c.plansCount}`).join("  •  ") ||
                    "No plan mix yet"
                  )}
                </div>
              ) : (
                <Button className="mt-4" variant="outline">
                  View report
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
