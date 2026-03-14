import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listAdminPauses, reviewAdminPause, type AdminPauseItem } from "@/lib/planPausesApi";

export default function PausesReview() {
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [items, setItems] = useState<AdminPauseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [active, setActive] = useState<AdminPauseItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminPauses(status);
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load pause requests");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  function openReview(item: AdminPauseItem, nextDecision: "APPROVE" | "REJECT") {
    setActive(item);
    setDecision(nextDecision);
    setReviewNote("");
    setOpen(true);
  }

  async function submitReview() {
    if (!active) return;
    setSaving(true);
    try {
      await reviewAdminPause(active.id, { decision, ...(reviewNote.trim() ? { reviewNote: reviewNote.trim() } : {}) });
      toast.success(`Pause request ${decision === "APPROVE" ? "approved" : "rejected"}.`);
      setOpen(false);
      setActive(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to review pause request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pause Requests</h1>
          <p className="text-sm text-muted-foreground">Approve or reject user pause requests after payout.</p>
        </div>
        <div className="flex gap-2">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading pause requests...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No pause requests for this filter.</div>
          ) : (
            <div className="divide-y">
              {items.map((x) => (
                <div key={x.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{x.user.fullName || x.user.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {x.plan.name} • Cycles {x.startCycleIndex + 1}-{x.endCycleIndex + 1} • {x.months} month(s)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Fee: {x.totalFee} • Ref: {x.paymentRef || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={x.status === "APPROVED" ? "default" : x.status === "REJECTED" ? "destructive" : "secondary"}>
                      {x.status}
                    </Badge>
                    {x.status === "SUBMITTED" ? (
                      <>
                        <Button onClick={() => openReview(x, "APPROVE")}>Approve</Button>
                        <Button variant="outline" onClick={() => openReview(x, "REJECT")}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{decision === "APPROVE" ? "Approve pause request" : "Reject pause request"}</DialogTitle>
            <DialogDescription>
              {decision === "APPROVE"
                ? "Approving will post PAUSED status for the selected future cycles."
                : "Rejecting keeps contribution schedule unchanged."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Review note (optional)</Label>
            <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Any note" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={saving}>
              {saving ? "Saving..." : decision === "APPROVE" ? "Approve pause" : "Reject pause"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
