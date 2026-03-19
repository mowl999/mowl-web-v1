import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { listPlans, type Plan } from "@/lib/plansApi";
import { listContributions, type Contribution } from "@/lib/contributionsApi";
import { listPayouts, type Payout } from "@/lib/payoutsApi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PlanSummary = {
  paid: number;
  pending: number;
  late: number;
  payoutSent: number;
  payoutPending: number;
  requiredUpToPayout: number;
  paidUpToPayout: number;
  payoutEligible: boolean;
};

function summarizePlan(plan: Plan, contributions: Contribution[], payouts: Payout[]): PlanSummary {
  const paid = contributions.filter((x) => x.status === "PAID").length;
  const pending = contributions.filter((x) => x.status === "PENDING").length;
  const late = contributions.filter((x) => x.status === "LATE").length;

  const payoutSent = payouts.filter((x) => x.status === "SENT").length;
  const payoutPending = payouts.filter((x) => x.status === "PENDING").length;

  const payoutMonth = plan.assignedPayoutMonth ?? plan.assignedPosition;
  const requiredUpToPayout = Math.max(0, Number(payoutMonth || 0));
  const paidUpToPayout = contributions.filter(
    (x) => x.cycleIndex < requiredUpToPayout && (x.status === "PAID" || x.status === "LATE")
  ).length;
  const payoutEligible = requiredUpToPayout > 0 && paidUpToPayout >= requiredUpToPayout;

  return {
    paid,
    pending,
    late,
    payoutSent,
    payoutPending,
    requiredUpToPayout,
    paidUpToPayout,
    payoutEligible,
  };
}

export default function ContributionsPage() {
  const nav = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PlanSummary>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await listPlans(null, 50);
      const items = res.items || [];
      setPlans(items);

      if (items.length === 0) {
        setSummaries({});
      } else {
        const rows = await Promise.all(
          items.map(async (plan) => {
            const [cRes, pRes] = await Promise.all([
              listContributions(plan.id).catch(() => ({ items: [] as Contribution[] })),
              listPayouts(plan.id).catch(() => ({ items: [] as Payout[] })),
            ]);
            return [plan.id, summarizePlan(plan, cRes.items || [], pRes.items || [])] as const;
          })
        );
        setSummaries(Object.fromEntries(rows));
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contributions</h1>
          <p className="text-sm text-slate-500">Choose a financial plan to view and manage contribution payments.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Your Plans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No financial plan yet. Create a plan first, then contributions will appear here.
            </div>
          ) : (
            <div className="divide-y">
              {plans.map((p) => (
                <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{p.name}</div>
                      <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>{p.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Month {Math.min(p.currentCycleIndex + 1, p.durationMonths ?? p.memberCount)} of {p.durationMonths ?? p.memberCount}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <Badge variant="outline">Paid: {summaries[p.id]?.paid ?? 0}</Badge>
                      <Badge variant="outline">Pending: {summaries[p.id]?.pending ?? 0}</Badge>
                      <Badge variant="outline">Late: {summaries[p.id]?.late ?? 0}</Badge>
                      <Badge variant="outline">Payout sent: {summaries[p.id]?.payoutSent ?? 0}</Badge>
                      <Badge variant="outline">Payout pending: {summaries[p.id]?.payoutPending ?? 0}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Payout eligibility: {summaries[p.id]?.paidUpToPayout ?? 0} / {summaries[p.id]?.requiredUpToPayout ?? 0} contributions cleared
                      {" "}
                      <span className={summaries[p.id]?.payoutEligible ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
                        ({summaries[p.id]?.payoutEligible ? "ready" : "not ready"})
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => nav(`/app/thrift/goals/${p.id}?tab=contributions`)}>
                    View contributions
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
