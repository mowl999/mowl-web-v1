import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { BadgeCheck, Clock3, Landmark, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { listAdminPayments, reviewAdminPayment, type AdminPaymentItem } from "@/lib/contributionPaymentsApi";
import { AdminQueueFilterBar } from "@/components/admin/AdminQueueFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border shadow-sm dashboard-card">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
          <div className="text-xs text-slate-500">{hint}</div>
        </div>
        <div className="rounded-xl border border-white/80 bg-indigo-50 p-2.5 shadow-sm">
          <Icon className="h-5 w-5 text-indigo-700" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentsReview() {
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"ALL" | "GATEWAY" | "BANK_TRANSFER">("ALL");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [items, setItems] = useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const pageSize = 10;

  const [reviewOpen, setReviewOpen] = useState(false);
  const [active, setActive] = useState<AdminPaymentItem | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

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

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return items.filter((item) => {
      if (channelFilter !== "ALL" && item.channel !== channelFilter) return false;
      if (
        dateRange !== "all" &&
        now - new Date(item.submittedAt).getTime() > (dateRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (!query) return true;
      const text = [
        item.user.fullName,
        item.user.email,
        item.plan.name,
        item.userReference,
        item.providerRef,
        item.channel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [items, search, channelFilter, dateRange]);

  const stats = useMemo(() => {
    const submitted = filteredItems.filter((item) => item.status === "SUBMITTED").length;
    const approved = filteredItems.filter((item) => item.status === "APPROVED").length;
    const rejected = filteredItems.filter((item) => item.status === "REJECTED").length;
    return { submitted, approved, rejected };
  }, [filteredItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page]);
  const selectablePageIds = pagedItems.filter((item) => item.status === "SUBMITTED").map((item) => item.id);
  const allPageSelected = selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [status, search, channelFilter, dateRange]);

  const hasActiveFilters =
    Boolean(search.trim()) || status !== "SUBMITTED" || channelFilter !== "ALL" || dateRange !== "30d";

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function toggleSelection(paymentId: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, paymentId]));
      return prev.filter((id) => id !== paymentId);
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, ...selectablePageIds]));
      return prev.filter((id) => !selectablePageIds.includes(id));
    });
  }

  async function runBulkReview(nextDecision: "APPROVE" | "REJECT") {
    if (selectedIds.length === 0) {
      toast.error("Select at least one submitted payment first.");
      return;
    }
    setBulkSaving(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          reviewAdminPayment(id, {
            decision: nextDecision,
          })
        )
      );
      toast.success(`Bulk ${nextDecision === "APPROVE" ? "approval" : "rejection"} completed.`);
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to process selected payments");
    } finally {
      setBulkSaving(false);
    }
  }

  function requestBulkReview(nextDecision: "APPROVE" | "REJECT") {
    if (selectedIds.length === 0) {
      toast.error("Select at least one submitted payment first.");
      return;
    }
    setBulkDecision(nextDecision);
    setBulkConfirmOpen(true);
  }

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
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Payments review</h1>
        <p className="text-sm text-slate-500">Review manual transfer submissions and confirm contribution posting.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Visible payments" value={items.length} hint="Current list result count" icon={WalletCards} />
        <SummaryTile label="Submitted" value={stats.submitted} hint="Awaiting review" icon={Clock3} />
        <SummaryTile label="Approved" value={stats.approved} hint="Posted successfully" icon={BadgeCheck} />
        <SummaryTile label="Rejected" value={stats.rejected} hint="Not posted to contributions" icon={Landmark} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-slate-950">Review queue</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Filter by payment status and process manual transfer confirmations.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <AdminQueueFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search user, plan or reference"
            filters={
              <>
                <Select value={status} onValueChange={(v) => setStatus(v as "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL")}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="ALL">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as "ALL" | "GATEWAY" | "BANK_TRANSFER")}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All channels</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                    <SelectItem value="GATEWAY">Gateway</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as "7d" | "30d" | "all")}>
                  <SelectTrigger className="w-[160px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7d</SelectItem>
                    <SelectItem value="30d">Last 30d</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            badges={[
              `Status: ${status === "ALL" ? "All" : status}`,
              `Channel: ${channelFilter === "ALL" ? "All channels" : channelFilter === "BANK_TRANSFER" ? "Bank transfer" : "Gateway"}`,
              `Window: ${dateRange === "all" ? "All time" : dateRange === "7d" ? "Last 7d" : "Last 30d"}`,
              `Results: ${filteredItems.length}`,
            ]}
            onClear={() => {
              setSearch("");
              setStatus("SUBMITTED");
              setChannelFilter("ALL");
              setDateRange("30d");
            }}
            canClear={hasActiveFilters}
            onRefresh={load}
            refreshing={loading}
          />
          <div className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={allPageSelected} onChange={(e) => toggleSelectAllOnPage(e.target.checked)} />
                <span>Select page</span>
              </label>
              <span>{selectedIds.length} selected</span>
              <span>Page {page} of {totalPages}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0 || bulkSaving}>
                Clear selection
              </Button>
              <Button variant="outline" size="sm" onClick={() => requestBulkReview("REJECT")} disabled={selectedIds.length === 0 || bulkSaving}>
                Bulk reject
              </Button>
              <Button size="sm" onClick={() => requestBulkReview("APPROVE")} disabled={selectedIds.length === 0 || bulkSaving}>
                Bulk approve
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-slate-500">Loading payments…</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No payments found for this filter.
            </div>
          ) : (
            pagedItems.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {payment.status === "SUBMITTED" ? (
                      <label className="mr-1 inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(payment.id)}
                          onChange={(e) => toggleSelection(payment.id, e.target.checked)}
                        />
                      </label>
                    ) : null}
                    <div className="font-medium text-slate-950">{payment.user.fullName || payment.user.email}</div>
                    <Badge variant={payment.status === "SUBMITTED" ? "secondary" : payment.status === "APPROVED" ? "default" : "destructive"}>
                      {payment.status}
                    </Badge>
                    <Badge variant="outline">{payment.channel === "BANK_TRANSFER" ? "Bank transfer" : payment.channel}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {payment.plan.name} • Cycle {payment.contribution.cycleIndex + 1} • {payment.amount} {payment.currency}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Ref {payment.userReference || payment.providerRef || "—"} • Submitted {new Date(payment.submittedAt).toLocaleString()}
                  </div>
                </div>

                {payment.status === "SUBMITTED" ? (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button onClick={() => openReview(payment, "APPROVE")}>Approve</Button>
                    <Button variant="outline" onClick={() => openReview(payment, "REJECT")}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}

          {!loading && filteredItems.length > pageSize ? (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{decision === "APPROVE" ? "Approve payment" : "Reject payment"}</DialogTitle>
            <DialogDescription>
              {decision === "APPROVE"
                ? "Approving will mark the contribution as paid and update credits."
                : "Reject submission and keep contribution pending."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {active ? (
              <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">{active.user.fullName || active.user.email}</div>
                <div className="mt-1">{active.plan.name} • Cycle {active.contribution.cycleIndex + 1}</div>
              </div>
            ) : null}
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

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{bulkDecision === "APPROVE" ? "Bulk approve payments" : "Bulk reject payments"}</DialogTitle>
            <DialogDescription>
              {bulkDecision === "APPROVE"
                ? `Approve ${selectedIds.length} selected payment${selectedIds.length > 1 ? "s" : ""} and post them to contributions.`
                : `Reject ${selectedIds.length} selected payment${selectedIds.length > 1 ? "s" : ""} and keep them pending.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-900">Selected payments</div>
            <div className="mt-1">{selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} on the current filtered queue.</div>
            <div className="mt-2 text-xs text-slate-500">
              {bulkDecision === "APPROVE"
                ? "Approved payments will post contributions and update credits immediately."
                : "Rejected payments will stay off-ledger so the contribution remains unpaid."}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkSaving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setBulkConfirmOpen(false);
                await runBulkReview(bulkDecision);
              }}
              disabled={bulkSaving}
            >
              {bulkSaving ? "Processing..." : bulkDecision === "APPROVE" ? "Confirm approval" : "Confirm rejection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
