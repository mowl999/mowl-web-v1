import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, useInvestDashboardData } from "./useInvestData";

export default function InvestmentOverviewPage() {
  const { data, loading, error, currency } = useInvestDashboardData();

  if (loading) {
    return (
      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardContent className="p-6 text-sm text-slate-500">Loading investment overview...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-red-100 bg-white shadow-sm dashboard-card">
        <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MyInvestment Overview</h1>
          <p className="mt-2 text-sm text-slate-500">
            Investment balances are independent of MyContributions. Each product grows by its configured rate.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Current Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {formatMoney(data?.summary.currentBalance || 0, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Contributed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {formatMoney(data?.summary.totalContributed || 0, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Projected Maturity Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {formatMoney(data?.summary.projectedMaturityValue || 0, currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader>
          <CardTitle className="text-base">Current Balance by Investment Product</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(data?.productBalances || []).map((p) => (
            <div key={p.productId} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{p.productName}</p>
                <p className="text-xs text-indigo-700">{p.annualRatePct}% APR</p>
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(p.currentBalance, p.currency)}</p>
              <p className="mt-1 text-xs text-slate-600">
                Contributed {formatMoney(p.totalContributed, p.currency)} · {p.activePlans} active of {p.plansCount} plan(s)
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader>
          <CardTitle className="text-base">Your Investment Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.plans || []).length === 0 ? (
            <div className="text-sm text-slate-500">
              No investment plans yet. Create plans from each module page: Long-Term, Short-Term, Retirement, Legacy, or Children Future.
            </div>
          ) : (
            (data?.plans || []).map((p) => (
              <div key={p.id} className="rounded-md border border-indigo-100 bg-white px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  <span className="text-xs text-slate-600">{p.productName}</span>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Balance {formatMoney(p.currentBalance, p.currency)} · Monthly {formatMoney(p.monthlyContribution, p.currency)} · {p.progressPct}% progress
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
