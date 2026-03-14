import { useCallback, useEffect, useState } from "react";
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

type TrendPoint = { date: string; value: number };
type ProductMetrics = {
  users: number;
  trends: {
    users: { d7: TrendPoint[]; d30: TrendPoint[] };
    activity: { d7: TrendPoint[]; d30: TrendPoint[] };
  };
  plans?: number;
  activePlans?: number;
  missedContributions?: number;
  pendingPayouts?: number;
  pauseRequestsSubmitted?: number;
  accountsWithActivity?: number;
  transactions?: number;
};

type CardTone = "thrift" | "investment" | "loans" | "fundTransfers";

const CARD_TONES: Record<
  CardTone,
  { card: string; title: string; content: string; metrics: string }
> = {
  thrift: {
    card: "border-sky-200 bg-sky-50/70",
    title: "text-sky-700",
    content: "text-slate-700",
    metrics: "[&_.text-foreground]:text-slate-900 [&_.text-muted-foreground]:text-slate-600",
  },
  investment: {
    card: "border-emerald-200 bg-emerald-50/70",
    title: "text-emerald-700",
    content: "text-slate-700",
    metrics: "[&_.text-foreground]:text-slate-900 [&_.text-muted-foreground]:text-slate-600",
  },
  loans: {
    card: "border-amber-200 bg-amber-50/70",
    title: "text-amber-700",
    content: "text-slate-700",
    metrics: "[&_.text-foreground]:text-slate-900 [&_.text-muted-foreground]:text-slate-600",
  },
  fundTransfers: {
    card: "border-indigo-200 bg-indigo-50/70",
    title: "text-indigo-700",
    content: "text-slate-700",
    metrics: "[&_.text-foreground]:text-slate-900 [&_.text-muted-foreground]:text-slate-600",
  },
};

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

export default function AdminHome() {
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

  const trendWindow = "7";
  const trendKey = "d7" as const;

  function MiniLineChart({
    title,
    points,
    stroke = "#4f46e5",
  }: {
    title: string;
    points: TrendPoint[];
    stroke?: string;
  }) {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const chartPoints = points?.length ? points : [{ date: "—", value: 0 }];
    const width = 100;
    const height = 64;
    const padX = 8;
    const padY = 8;
    const min = Math.min(...chartPoints.map((p) => p.value || 0));
    const max = Math.max(...chartPoints.map((p) => p.value || 0));
    const span = Math.max(1, max - min);
    const step = (width - padX * 2) / Math.max(1, chartPoints.length - 1);

    const coords = chartPoints.map((p, i) => {
      const x = padX + i * step;
      const y = height - padY - ((p.value - min) / span) * (height - padY * 2);
      return { x, y };
    });

    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
    const activeIdx = hoverIdx ?? Math.max(0, chartPoints.length - 1);
    const activePoint = chartPoints[activeIdx];
    const first = chartPoints[0]?.value ?? 0;
    const last = chartPoints[chartPoints.length - 1]?.value ?? 0;
    const delta = last - first;
    const deltaLabel = delta > 0 ? `+${delta}` : `${delta}`;
    const deltaTone = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-500";

    return (
      <div className="w-full overflow-hidden rounded-lg border bg-white px-2 py-2">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{title}</span>
          <span className={deltaTone}>{deltaLabel}</span>
        </div>
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="block h-16 w-full">
            <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {coords.map((c, i) => (
              <circle
                key={`${title}-${chartPoints[i].date}`}
                cx={c.x}
                cy={c.y}
                r={i === activeIdx ? 3.5 : 2.5}
                fill={i === activeIdx ? stroke : "#a5b4fc"}
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}
          </svg>
          <div className="mt-1 text-[11px] text-slate-500">
            {activePoint?.date}: <span className="font-medium text-slate-700">{activePoint?.value ?? 0}</span>
          </div>
        </div>
      </div>
    );
  }

  function ProductTrendSection({ product }: { product: ProductMetrics }) {
    return (
      <div className="grid gap-2">
        <MiniLineChart title={`Activity volume (${trendWindow}d)`} points={product.trends.activity[trendKey]} stroke="#0f766e" />
      </div>
    );
  }

  function MetricRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="font-medium text-foreground">{value ?? "—"}</span>
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
    metrics: Array<{ label: string; value: string | number | null | undefined }>;
    tone: CardTone;
  }) {
    const toneStyle = CARD_TONES[tone];
    const paddedMetrics = [...metrics];
    while (paddedMetrics.length < 4) paddedMetrics.push({ label: "—", value: "—" });

    return (
      <Card
        className={cn(
          "h-full overflow-hidden rounded-2xl flex flex-col dashboard-card",
          toneStyle.card
        )}
      >
        <CardHeader className="pb-2 space-y-1">
          <CardTitle className={cn("text-sm text-muted-foreground", toneStyle.title)}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("flex flex-1 flex-col gap-3 text-sm overflow-hidden", toneStyle.content)}>
          <div className="text-2xl font-semibold">{product.users} users</div>
          <div className={cn("min-h-[98px] space-y-1.5", toneStyle.metrics)}>
            {paddedMetrics.map((m, idx) => (
              <MetricRow key={`${title}-${m.label}-${idx}`} label={m.label} value={m.value} />
            ))}
          </div>
          <div className="mt-auto w-full overflow-hidden">
            <ProductTrendSection product={product} />
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Console</h1>
          <p className="text-sm text-muted-foreground">
            System-wide overview and risk signals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as "7d" | "30d" | "90d" | "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
              <SelectItem value="90d">Last 90d</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {err && (
        <Card className="rounded-2xl border-destructive/30 dashboard-card">
          <CardHeader>
            <CardTitle className="text-base">Couldn’t load admin dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{err}</div>
            <Button onClick={load}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}

      {!loading && data && (
        <>
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProductCard
              title="MyContributions"
              product={data.products.thrift}
              tone="thrift"
              metrics={[
                { label: "Plans", value: data.products.thrift.plans },
                { label: "Active plans", value: data.products.thrift.activePlans },
                { label: "Missed contributions", value: data.products.thrift.missedContributions },
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
                { label: "Accounts with activity", value: data.products.investment.accountsWithActivity },
              ]}
            />
            <ProductCard
              title="MyLoan"
              product={data.products.loans}
              tone="loans"
              metrics={[
                { label: "Accounts with activity", value: data.products.loans.accountsWithActivity },
                { label: "Transactions", value: data.products.loans.transactions },
              ]}
            />
            <ProductCard
              title="MyFundTransfers"
              product={data.products.fundTransfers}
              tone="fundTransfers"
              metrics={[
                { label: "Accounts with activity", value: data.products.fundTransfers.accountsWithActivity },
                { label: "Transactions", value: data.products.fundTransfers.transactions },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl dashboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total users (all products)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.totals.users}</CardContent>
            </Card>
            <Card className="rounded-2xl dashboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending payouts</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.totals.pendingPayouts}</CardContent>
            </Card>
            <Card className="rounded-2xl dashboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Submitted pause requests</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.products.thrift.pauseRequestsSubmitted}</CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl dashboard-card">
            <CardHeader>
              <CardTitle className="text-base">Top risk: missed contributions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.risk.topMissedUsers.length === 0 ? (
                <div className="text-sm text-muted-foreground">No risk signals right now.</div>
              ) : (
                <div className="divide-y rounded-xl border">
                  {data.risk.topMissedUsers.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between p-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {u.fullName || u.email || u.userId}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.email || "—"} {u.state ? `• ${u.state}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{u.missedCount} missed</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl dashboard-card">
            <CardHeader>
              <CardTitle className="text-base">Contribution Split (Admin)</CardTitle>
            </CardHeader>
            <CardContent>
              {!split ? (
                <div className="text-sm text-muted-foreground">No split report yet.</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Base contribution total</div>
                    <div className="text-xl font-semibold">{formatMoney(split.totals.baseContributionTotal)}</div>
                    <div className="text-xs text-muted-foreground">
                      Settled contributions: {split.totals.contributionsCount}
                    </div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Position interest (net)</div>
                    <div className="text-xl font-semibold">{formatMoney(split.totals.positionInterestNet)}</div>
                    <div className="text-xs text-muted-foreground">
                      Charges: {formatMoney(split.totals.positionInterestCharges)} • Compensation: {formatMoney(split.totals.positionInterestCompensation)}
                    </div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Total charges</div>
                    <div className="text-xl font-semibold">{formatMoney(split.totals.totalCharges)}</div>
                    <div className="text-xs text-muted-foreground">
                      Swap fees: {formatMoney(split.totals.approvedSwapFees)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl dashboard-card">
            <CardHeader>
              <CardTitle className="text-base">Pause Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div className="text-xl font-semibold">{data.pauses.submittedCount}</div>
                  <div className="text-xs text-muted-foreground">
                    Fee total: {formatMoney(data.pauses.submittedFeesTotal)}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Approved</div>
                  <div className="text-xl font-semibold">{data.pauses.approvedCount}</div>
                  <div className="text-xs text-muted-foreground">
                    Fee total: {formatMoney(data.pauses.approvedFeesTotal)}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Rejected</div>
                  <div className="text-xl font-semibold">{data.pauses.rejectedCount}</div>
                  <div className="text-xs text-muted-foreground">No fee posted</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
