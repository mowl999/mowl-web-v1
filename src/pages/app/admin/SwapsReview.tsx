import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getAdminSwapLedgerByRange, listAdminSwaps, reviewAdminSwap, type AdminSwapItem, type AdminSwapLedger } from "@/lib/swapsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function SwapsReview() {
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [ledgerRange, setLedgerRange] = useState<"7d" | "30d" | "all">("30d");
  const [items, setItems] = useState<AdminSwapItem[]>([]);
  const [ledger, setLedger] = useState<AdminSwapLedger | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [active, setActive] = useState<AdminSwapItem | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, ledgerRes] = await Promise.all([listAdminSwaps(status), getAdminSwapLedgerByRange(ledgerRange)]);
      setItems(listRes.items || []);
      setLedger(ledgerRes);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load swap requests");
    } finally {
      setLoading(false);
    }
  }, [status, ledgerRange]);

  useEffect(() => {
    load();
  }, [load]);

  function openReview(item: AdminSwapItem, next: "APPROVE" | "REJECT") {
    setActive(item);
    setDecision(next);
    setReviewNote("");
    setReviewOpen(true);
  }

  async function submitReview() {
    if (!active) return;
    setSaving(true);
    try {
      await reviewAdminSwap(active.id, {
        decision,
        ...(reviewNote.trim() ? { reviewNote: reviewNote.trim() } : {}),
      });
      toast.success(`Swap request ${decision === "APPROVE" ? "approved" : "rejected"}.`);
      setReviewOpen(false);
      setActive(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to review swap");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Swap Requests</h1>
          <p className="text-sm text-muted-foreground">
            Approve or reject user position swap requests for early payout eligibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
              <SelectItem value="APPROVED">APPROVED</SelectItem>
              <SelectItem value="REJECTED">REJECTED</SelectItem>
              <SelectItem value="ALL">ALL</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ledgerRange} onValueChange={(v) => setLedgerRange(v as "7d" | "30d" | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Swap Charges Ledger</CardTitle>
          <div className="text-xs text-muted-foreground">
            Range: {ledgerRange === "7d" ? "Last 7 days" : ledgerRange === "30d" ? "Last 30 days" : "All time"}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-sky-50/40 p-3">
              <div className="text-xs text-muted-foreground">Total fees collected</div>
              <div className="text-xl font-semibold">{ledger?.totals.totalFeesCollected ?? 0}</div>
              <div className="text-xs text-muted-foreground">Approved swap charges posted</div>
            </div>
            <div className="rounded-xl border bg-amber-50/40 p-3">
              <div className="text-xs text-muted-foreground">Pending exposure</div>
              <div className="text-xl font-semibold">{ledger?.totals.pendingExposure ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                {ledger?.counts.pendingSwaps ?? 0} submitted swap requests
              </div>
            </div>
            <div className="rounded-xl border bg-emerald-50/40 p-3">
              <div className="text-xs text-muted-foreground">Approved swaps</div>
              <div className="text-xl font-semibold">{ledger?.counts.approvedSwaps ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                Rejected: {ledger?.counts.rejectedSwaps ?? 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submitted requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No swap requests for this filter.</div>
          ) : (
            <div className="divide-y">
              {items.map((x) => (
                <div key={x.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{x.user.fullName || x.user.email}</div>
                      <Badge variant={x.status === "SUBMITTED" ? "secondary" : x.status === "APPROVED" ? "default" : "destructive"}>
                        {x.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Plan: {x.plan.name} • Move {x.fromPosition} → {x.toPosition} • Steps: {x.steps} • Fee: {x.feeCharged}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current plan position: {x.plan.assignedPosition} • Current cycle: {x.plan.currentCycleIndex + 1}
                    </div>
                  </div>
                  {x.status === "SUBMITTED" ? (
                    <div className="flex items-center gap-2">
                      <Button onClick={() => openReview(x, "APPROVE")}>Approve</Button>
                      <Button variant="outline" onClick={() => openReview(x, "REJECT")}>Reject</Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{decision === "APPROVE" ? "Approve swap request" : "Reject swap request"}</DialogTitle>
            <DialogDescription>
              {decision === "APPROVE"
                ? "Approving will update user payout position and increment swap usage."
                : "Reject this request and keep current payout position unchanged."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Review note (optional)</Label>
              <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Any note" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submitReview} disabled={saving}>
                {saving ? "Saving..." : decision === "APPROVE" ? "Approve swap" : "Reject swap"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
