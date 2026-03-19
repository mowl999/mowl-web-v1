import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Clock3, PauseCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

type AdminDashboard = {
  totals: {
    users: number;
    plans: number;
    activePlans: number;
    missedContributions: number;
    pendingPayouts: number;
  };
  risk: {
    topMissedUsers: Array<{
      userId: string;
      missedCount: number;
      email?: string;
      fullName?: string;
      state?: string;
    }>;
  };
  queues: {
    pendingPayouts: number;
  };
  products: {
    thrift: ProductMetrics;
    investment: ProductMetrics;
    loans: ProductMetrics;
    fundTransfers: ProductMetrics;
  };
  pauses: {
    submittedCount: number;
    approvedCount: number;
    rejectedCount: number;
    submittedFeesTotal: number;
    approvedFeesTotal: number;
  };
};

type ProductMetrics = {
  users: number;
  trends: {
    users: { d7: Array<{ date: string; value: number }>; d30: Array<{ date: string; value: number }> };
    activity: { d7: Array<{ date: string; value: number }>; d30: Array<{ date: string; value: number }> };
  };
  plans?: number;
  activePlans?: number;
  missedContributions?: number;
  pendingPayouts?: number;
  pauseRequestsSubmitted?: number;
  accountsWithActivity?: number;
  transactions?: number;
  repaidTotal?: number;
};

type CardTone = "thrift" | "investment" | "loans" | "fundTransfers";

type ContributionSplitReport = {
  range: "7d" | "30d" | "90d" | "all";
  generatedAt: string;
  totals: {
    contributionsCount: number;
    baseContributionTotal: number;
    totalCollectedFromContributions: number;
    positionInterestNet: number;
    positionInterestCharges: number;
    positionInterestCompensation: number;
    approvedSwapFees: number;
    totalCharges: number;
  };
};

type ProductCardMetric = {
  label: string;
  value: string | number | null | undefined;
};

type SummaryCardProps = {
  title: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: "slate" | "indigo" | "amber" | "rose";
};

const CARD_TONES: Record<
  CardTone,
  {
    shell: string;
    badge: string;
    title: string;
    metricTile: string;
  }
> = {
  thrift: {
    shell: "border-indigo-100 bg-white",
    badge: "bg-indigo-50 text-indigo-700",
    title: "text-slate-900",
    metricTile: "border-indigo-100 bg-indigo-50/40",
  },
  investment: {
    shell: "border-indigo-100 bg-white",
    badge: "bg-indigo-50 text-indigo-700",
    title: "text-slate-900",
    metricTile: "border-indigo-100 bg-indigo-50/40",
  },
  loans: {
    shell: "border-indigo-100 bg-white",
    badge: "bg-indigo-50 text-indigo-700",
    title: "text-slate-900",
    metricTile: "border-indigo-100 bg-indigo-50/40",
  },
  fundTransfers: {
    shell: "border-indigo-100 bg-white",
    badge: "bg-indigo-50 text-indigo-700",
    title: "text-slate-900",
    metricTile: "border-indigo-100 bg-indigo-50/40",
  },
};

const SUMMARY_TONES: Record<SummaryCardProps["tone"], string> = {
  slate: "border-indigo-100 bg-white",
  indigo: "border-indigo-100 bg-white",
  amber: "border-indigo-100 bg-white",
  rose: "border-indigo-100 bg-white",
};

function SummaryCard({ title, value, hint, icon: Icon, tone }: SummaryCardProps) {
  return (
    <Card className={cn("rounded-2xl border shadow-sm dashboard-card", SUMMARY_TONES[tone])}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
          <div className="text-xs text-slate-500">{hint}</div>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/80 p-2.5 shadow-sm">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
}

function PanelMetric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex h-full min-h-[132px] min-w-0 flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-3 min-w-0 break-words text-xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-2xl">
        {value}
      </div>
      <div className="mt-auto pt-3 text-xs text-slate-500">{hint || ""}</div>
    </div>
  );
}

function ProductCard({
  title,
  product,
  metrics,
  tone,
}: {
  title: string;
  product: ProductMetrics;
  metrics: ProductCardMetric[];
  tone: CardTone;
}) {
  const toneStyle = CARD_TONES[tone];

  return (
    <Card className={cn("rounded-2xl border shadow-sm dashboard-card", toneStyle.shell)}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={cn("text-sm font-semibold", toneStyle.title)}>{title}</div>
            <div className="mt-1 text-xs text-slate-500">Product performance snapshot</div>
          </div>
          <div className={cn("rounded-full px-3 py-1 text-xs font-semibold", toneStyle.badge)}>
            {product.users} users
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={`${title}-${metric.label}`} className={cn("rounded-xl border p-3 shadow-sm", toneStyle.metricTile)}>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{metric.label}</div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{metric.value ?? "—"}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopRiskCard({ users }: { users: AdminDashboard["risk"]["topMissedUsers"] }) {
  return (
    <Card className="rounded-2xl border shadow-sm dashboard-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base text-slate-950">Top risk: missed contributions</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Users currently carrying the highest repayment pressure.</p>
        </div>
        <div className="rounded-xl border bg-rose-50 p-2.5 text-rose-600 shadow-sm">
          <AlertTriangle className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No risk signals right now.
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.userId} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-950">{user.fullName || user.email || user.userId}</div>
                  <div className="truncate text-xs text-slate-500">
                    {user.email || "—"}
                    {user.state ? <span>{` • ${user.state}`}</span> : null}
                  </div>
                </div>
                <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {user.missedCount} missed
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContributionSplitCard({ split }: { split: ContributionSplitReport | null }) {
  return (
    <Card className="rounded-2xl border shadow-sm dashboard-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base text-slate-950">Contribution totals</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Breakdown of base collections, interest spread, and fee income.</p>
        </div>
        {split ? (
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {split.range.toUpperCase()}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {!split ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No split report yet.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <PanelMetric
              label="Base collected"
              value={formatMoney(split.totals.baseContributionTotal)}
              hint={`Settled contributions: ${split.totals.contributionsCount}`}
            />
            <PanelMetric
              label="Interest net"
              value={formatMoney(split.totals.positionInterestNet)}
              hint={`Charges ${formatMoney(split.totals.positionInterestCharges)} • Compensation ${formatMoney(split.totals.positionInterestCompensation)}`}
            />
            <PanelMetric
              label="Fee income"
              value={formatMoney(split.totals.totalCharges)}
              hint={`Swap fees ${formatMoney(split.totals.approvedSwapFees)}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PauseAnalyticsCard({ pauses }: { pauses: AdminDashboard["pauses"] }) {
  return (
    <Card className="rounded-2xl border shadow-sm dashboard-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base text-slate-950">Pause analytics</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Review pause demand and the fees approved from post-payout pauses.</p>
        </div>
        <div className="rounded-xl border bg-indigo-50 p-2.5 text-indigo-600 shadow-sm">
          <PauseCircle className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-3">
          <PanelMetric
            label="Submitted"
            value={pauses.submittedCount}
            hint={`Fee total ${formatMoney(pauses.submittedFeesTotal)}`}
          />
          <PanelMetric
            label="Approved"
            value={pauses.approvedCount}
            hint={`Fee total ${formatMoney(pauses.approvedFeesTotal)}`}
          />
          <PanelMetric label="Rejected" value={pauses.rejectedCount} hint="No fee posted" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [split, setSplit] = useState<ContributionSplitReport | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [res, splitRes] = await Promise.all([
        apiFetch<AdminDashboard>("/v1/dashboard/admin"),
        apiFetch<ContributionSplitReport>(`/v1/admin/reports/contribution-split?range=${range}`),
      ]);
      setData(res);
      setSplit(splitRes);
    } catch (e: any) {
      setData(null);
      setSplit(null);
      setErr(e?.message || "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: "Total users",
        value: data.totals.users,
        hint: "Across all products and admin accounts",
        icon: Users,
        tone: "slate" as const,
      },
      {
        title: "Total plans",
        value: data.totals.plans,
        hint: `${data.totals.activePlans} currently active`,
        icon: ArrowUpRight,
        tone: "indigo" as const,
      },
      {
        title: "Pending payouts",
        value: data.totals.pendingPayouts,
        hint: "Plans awaiting payout processing",
        icon: Clock3,
        tone: "amber" as const,
      },
      {
        title: "Missed contributions",
        value: data.totals.missedContributions,
        hint: "Current missed payment obligations",
        icon: AlertTriangle,
        tone: "rose" as const,
      },
    ];
  }, [data]);

  const quickActions = [
    {
      label: "Open users",
      hint: "Manage roles and product access",
      onClick: () => navigate("/app/admin/users"),
    },
    {
      label: "Loan dashboard",
      hint: "Monitor repayment pressure and reminders",
      onClick: () => navigate("/app/admin/loans/dashboard"),
    },
    {
      label: "Loan equity",
      hint: "Confirm manual equity funding",
      onClick: () => navigate("/app/admin/loans/equity"),
    },
    {
      label: "Loan products",
      hint: "Maintain product and equity rules",
      onClick: () => navigate("/app/admin/loans/products"),
    },
    {
      label: "Loan repayments",
      hint: "Review manual repayment submissions",
      onClick: () => navigate("/app/admin/loans/repayments"),
    },
    {
      label: "Review payments",
      hint: "Approve manual transfers",
      onClick: () => navigate("/app/admin/payments"),
    },
    {
      label: "Review swaps",
      hint: "Approve position change requests",
      onClick: () => navigate("/app/admin/swaps"),
    },
    {
      label: "Review pauses",
      hint: "Handle pause approvals",
      onClick: () => navigate("/app/admin/pauses"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Admin Console
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Monitor product performance, operational queues, and revenue signals in one place.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-sm sm:flex-row sm:items-center">
          <Select value={range} onValueChange={(v) => setRange(v as "7d" | "30d" | "90d" | "all") }>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
              <SelectItem value="90d">Last 90d</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-white" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {err ? (
        <Card className="rounded-2xl border-destructive/30 shadow-sm dashboard-card">
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Couldn’t load admin dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-slate-500">{err}</div>
            <Button onClick={load}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      {loading ? <div className="text-sm text-slate-500">Loading dashboard…</div> : null}

      {!loading && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.title} {...card} />
            ))}
          </div>

          <Card className="rounded-2xl border shadow-sm dashboard-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-950">Quick actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="rounded-xl border border-indigo-100 bg-white px-4 py-4 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <div className="text-sm font-semibold text-slate-900">{action.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{action.hint}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
            <ProductCard
              title="MyContributions"
              product={data.products.thrift}
              tone="thrift"
              metrics={[
                { label: "Plans", value: data.products.thrift.plans },
                { label: "Active plans", value: data.products.thrift.activePlans },
                { label: "Missed", value: data.products.thrift.missedContributions },
                { label: "Pending payouts", value: data.products.thrift.pendingPayouts },
              ]}
            />
            <ProductCard
              title="MyInvestment"
              product={data.products.investment}
              tone="investment"
              metrics={[
                { label: "Plans", value: data.products.investment.plans },
                { label: "Active plans", value: data.products.investment.activePlans },
                { label: "Accounts active", value: data.products.investment.accountsWithActivity },
                { label: "Transactions", value: data.products.investment.transactions },
              ]}
            />
            <ProductCard
              title="MyLoan"
              product={data.products.loans}
              tone="loans"
              metrics={[
                { label: "Live facilities", value: data.products.loans.activePlans ?? 0 },
                { label: "Overdue installments", value: data.products.loans.missedContributions ?? 0 },
                { label: "Pending repayment reviews", value: data.products.loans.pendingPayouts ?? 0 },
                { label: "Repaid total", value: formatMoney(data.products.loans.repaidTotal ?? 0) },
              ]}
            />
            <ProductCard
              title="MyFundTransfers"
              product={data.products.fundTransfers}
              tone="fundTransfers"
              metrics={[
                { label: "Accounts active", value: data.products.fundTransfers.accountsWithActivity },
                { label: "Transactions", value: data.products.fundTransfers.transactions },
                { label: "Users", value: data.products.fundTransfers.users },
                { label: "Plans", value: data.products.fundTransfers.plans ?? 0 },
              ]}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <TopRiskCard users={data.risk.topMissedUsers} />
              <PauseAnalyticsCard pauses={data.pauses} />
            </div>
            <div className="space-y-4">
              <ContributionSplitCard split={split} />
              <Card className="rounded-2xl border shadow-sm dashboard-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-950">Operational queues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <PanelMetric
                      label="Pending payouts"
                      value={data.queues.pendingPayouts}
                      hint="Awaiting admin or cycle action"
                    />
                    <PanelMetric
                      label="Pause requests"
                      value={data.products.thrift.pauseRequestsSubmitted ?? 0}
                      hint="Submitted from MyContributions"
                    />
                    <PanelMetric
                      label="Active thrift plans"
                      value={data.products.thrift.activePlans ?? 0}
                      hint="Currently live contribution plans"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
