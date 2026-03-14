import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatMoney, trustLabel } from "@/lib/format";
import { getUserDashboard, type UserDashboard } from "@/lib/dashboardApi";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function WorkspaceHome() {
  const { workspaceId, label } = useWorkspace();

  const [data, setData] = useState<UserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await getUserDashboard();
      setData(res);
    } catch (e: any) {
      setData(null);
      setErrMsg(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Derived stats (real)
  const derived = useMemo(() => {
    if (!data) return null;
    const plans = data.plans || [];
    const activePlans = plans.filter((p) => p.status === "ACTIVE").length;

    // Use the most common currency among plans (fallback GBP)
    const currency = plans[0]?.currency || "GBP";

    // Total contribution “per cycle” across active plans (simple proxy)
    const totalPerCycle = plans
      .filter((p) => p.status === "ACTIVE")
      .reduce((sum, p) => sum + (p.contributionAmount || 0), 0);

    // Next payout count
    const nextPayoutCount = plans.filter((p) => !!p.nextPayout).length;

    return { activePlans, totalPerCycle, currency, nextPayoutCount };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
          <p className="text-sm text-muted-foreground">
            Real-time snapshot from your account.
          </p>
        </div>

        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {errMsg && (
        <Card className="rounded-2xl border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Couldn’t load dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{errMsg}</div>
            <Button onClick={load}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && data && workspaceId === "thrift" && derived && (
        <>
          {/* Reputation */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Credit score" value={`${data.reputation.creditScore}`} />
            <Stat label="Trust score" value={`${data.reputation.trustScore}`} />
            <Stat label="Trust level" value={trustLabel(data.reputation.trustLevel)} />
            <Stat label="Penalties total" value={`${data.reputation.penaltiesTotal}`} />
          </div>

          {/* Plans overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total plans" value={`${data.plans.length}`} />
            <Stat label="Active plans" value={`${derived.activePlans}`} />
            <Stat
              label="Total per cycle"
              value={formatMoney(derived.totalPerCycle, derived.currency)}
            />
            <Stat label="Plans with next payout" value={`${derived.nextPayoutCount}`} />
          </div>

          {/* Next payouts list */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Next payouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.plans.filter((p) => p.nextPayout).length === 0 ? (
                <div className="text-sm text-muted-foreground">No upcoming payouts yet.</div>
              ) : (
                data.plans
                  .filter((p) => p.nextPayout)
                  .slice(0, 8)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-1 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Cycle {p.nextPayout!.cycleIndex + 1} • Recipient:{" "}
                          {p.nextPayout!.recipientName ?? `Position ${p.nextPayout!.recipientPosition}`}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatMoney(p.nextPayout!.potAmount, p.currency)}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && data && workspaceId !== "thrift" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">{label} Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              Your backend currently returns strong “thrift/contributions” dashboard data.
            </div>
            <div>
              Next, we’ll extend the API to include {workspaceId} metrics, or create separate endpoints.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
