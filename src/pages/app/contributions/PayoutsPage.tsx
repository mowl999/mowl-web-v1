import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { listPlans, type Plan } from "@/lib/plansApi";
import { getSwapQuote, listMySwaps, requestSwap, type SwapItem, type SwapQuote } from "@/lib/swapsApi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PayoutsPage() {
  const nav = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [swapOpen, setSwapOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [targetPosition, setTargetPosition] = useState<string>("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [swapHistory, setSwapHistory] = useState<SwapItem[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await listPlans(null, 50);
      setPlans(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const range = useMemo(() => {
    if (!activePlan) return null;
    const minTarget = activePlan.currentCycleIndex + 1;
    const maxTarget = (activePlan.assignedPayoutMonth ?? activePlan.assignedPosition) - 1;
    return { minTarget, maxTarget };
  }, [activePlan]);

  const canRequestSwap = Boolean(range && range.maxTarget >= range.minTarget);

  async function openSwap(plan: Plan) {
    setActivePlan(plan);
    setQuote(null);
    setSwapHistory([]);
    const minTarget = plan.currentCycleIndex + 1;
    const maxTarget = (plan.assignedPayoutMonth ?? plan.assignedPosition) - 1;
    setTargetPosition(maxTarget >= minTarget ? String(minTarget) : "");
    setSwapOpen(true);
    try {
      const res = await listMySwaps(plan.id);
      setSwapHistory(res.items || []);
    } catch {
      setSwapHistory([]);
    }
  }

  async function fetchQuote() {
    if (!activePlan) return;
    const target = Number(targetPosition);
    if (!Number.isInteger(target) || target <= 0) {
      return toast.error("Select a valid target position.");
    }
    setQuoteLoading(true);
    try {
      const out = await getSwapQuote(activePlan.id, target);
      setQuote(out);
    } catch (e: any) {
      setQuote(null);
      toast.error(e?.message || "Unable to get swap quote");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function submitSwapRequest() {
    if (!activePlan) return;
    const target = Number(targetPosition);
    if (!Number.isInteger(target) || target <= 0) {
      return toast.error("Select a valid target position.");
    }
    setRequesting(true);
    try {
      await requestSwap(activePlan.id, target);
      toast.success("Swap request submitted. Admin review is required.");
      setSwapOpen(false);
      setActivePlan(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit swap request");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payouts</h1>
          <p className="text-sm text-slate-500">
            View payout schedule and request a position swap for earlier payout.
          </p>
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
              No financial plan yet. Create a plan first, then payouts will appear here.
            </div>
          ) : (
            <div className="divide-y">
              {plans.map((p) => {
                const payoutMonth = p.assignedPayoutMonth ?? p.assignedPosition;
                const minTarget = p.currentCycleIndex + 1;
                const maxTarget = payoutMonth - 1;
                const canSwap = maxTarget >= minTarget;
                return (
                  <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{p.name}</div>
                        <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>{p.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assigned payout month: {payoutMonth} • Current month: {p.currentCycleIndex + 1}
                      </div>
                      {!canSwap ? (
                        <div className="text-xs text-amber-700 mt-1">
                          Position swap is unavailable for this plan at the current cycle.
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => nav(`/app/thrift/goals/${p.id}?tab=payouts`)}>
                        View payouts
                      </Button>
                      <Button onClick={() => openSwap(p)} disabled={!canSwap}>
                        Request swap
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request position swap</DialogTitle>
            <DialogDescription>
              Lower target positions carry higher swap charges. Requests require admin approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3">
              <div>Current position: <span className="font-medium">{activePlan?.assignedPayoutMonth ?? activePlan?.assignedPosition}</span></div>
              <div>Current cycle month: <span className="font-medium">{(activePlan?.currentCycleIndex ?? 0) + 1}</span></div>
              {range ? (
                <div>
                  Allowed swap range: <span className="font-medium">{range.minTarget} - {range.maxTarget}</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Target position</label>
              <select
                className="h-10 w-full rounded-md border border-sky-200 bg-white px-3 text-sm"
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                disabled={!canRequestSwap}
              >
                {!canRequestSwap ? <option value="">No valid target</option> : null}
                {range && canRequestSwap
                  ? Array.from({ length: range.maxTarget - range.minTarget + 1 }, (_, i) => range.minTarget + i).map((pos) => (
                      <option key={pos} value={pos}>
                        Position {pos}
                      </option>
                    ))
                  : null}
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchQuote} disabled={!canRequestSwap || quoteLoading}>
                {quoteLoading ? "Calculating..." : "Get quote"}
              </Button>
              <Button onClick={submitSwapRequest} disabled={!canRequestSwap || requesting}>
                {requesting ? "Submitting..." : "Submit request"}
              </Button>
            </div>

            {quote ? (
              <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3 space-y-1">
                <div>
                  Move: <span className="font-medium">{quote.fromPosition}</span> to{" "}
                  <span className="font-medium">{quote.toPosition}</span>
                </div>
                <div>
                  Estimated swap charge: <span className="font-medium">{quote.feeCharged}</span>
                </div>
                <div>
                  Payout month impact: <span className="font-medium">{quote.payoutImpact.oldPayoutCycleIndex + 1}</span> to{" "}
                  <span className="font-medium">{quote.payoutImpact.newPayoutCycleIndex + 1}</span>
                </div>
                <div className="text-xs text-slate-600">
                  Trust level: {quote.userMetrics.trustLevel} ({quote.userMetrics.trustScore})
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium mb-1">Recent swap requests</div>
              {swapHistory.length === 0 ? (
                <div className="text-xs text-muted-foreground">No previous requests.</div>
              ) : (
                <div className="space-y-1">
                  {swapHistory.slice(0, 5).map((s) => (
                    <div key={s.id} className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()} • {s.fromPosition}→{s.toPosition} • {s.status}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
