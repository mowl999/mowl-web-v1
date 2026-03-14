import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { listAdminPayments, reviewAdminPayment, type AdminPaymentItem } from "@/lib/contributionPaymentsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function PaymentsReview() {
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [items, setItems] = useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [active, setActive] = useState<AdminPaymentItem | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminPayments(status);
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  function openReview(item: AdminPaymentItem, next: "APPROVE" | "REJECT") {
    setActive(item);
    setDecision(next);
    setReviewNote("");
    setPaymentRef(item.userReference || item.providerRef || "");
    setReviewOpen(true);
  }

  async function submitReview() {
    if (!active) return;
    setSaving(true);
    try {
      await reviewAdminPayment(active.id, {
        decision,
        ...(reviewNote.trim() ? { reviewNote: reviewNote.trim() } : {}),
        ...(decision === "APPROVE" && paymentRef.trim() ? { paymentRef: paymentRef.trim() } : {}),
      });
      toast.success(`Payment ${decision === "APPROVE" ? "approved" : "rejected"}.`);
      setReviewOpen(false);
      setActive(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to review payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments Review</h1>
          <p className="text-sm text-muted-foreground">Review manual transfer submissions and post contributions.</p>
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
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No submissions for this filter.</div>
          ) : (
            <div className="divide-y">
              {items.map((p) => (
                <div key={p.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{p.user.fullName || p.user.email}</div>
                      <Badge variant={p.status === "SUBMITTED" ? "secondary" : p.status === "APPROVED" ? "default" : "destructive"}>
                        {p.status}
                      </Badge>
                      <Badge variant="outline">{p.channel}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Plan: {p.plan.name} • Cycle {p.contribution.cycleIndex + 1} • Amount: {p.amount} {p.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ref: {p.userReference || p.providerRef || "—"} • Submitted: {new Date(p.submittedAt).toLocaleString()}
                    </div>
                  </div>
                  {p.status === "SUBMITTED" ? (
                    <div className="flex items-center gap-2">
                      <Button onClick={() => openReview(p, "APPROVE")}>Approve</Button>
                      <Button variant="outline" onClick={() => openReview(p, "REJECT")}>Reject</Button>
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
            <DialogTitle>{decision === "APPROVE" ? "Approve payment" : "Reject payment"}</DialogTitle>
            <DialogDescription>
              {decision === "APPROVE"
                ? "Approving will mark the contribution as PAID and update credits."
                : "Reject submission and keep contribution pending."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {decision === "APPROVE" ? (
              <div className="space-y-1">
                <Label>Payment reference</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Confirmed bank ref" />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Review note (optional)</Label>
              <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Any note" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submitReview} disabled={saving}>
                {saving ? "Saving..." : decision === "APPROVE" ? "Approve and post" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
