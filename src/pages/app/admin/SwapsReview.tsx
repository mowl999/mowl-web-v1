import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { ArrowLeftRight, Clock3, Coins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  getAdminSwapLedgerByRange,
  listAdminSwaps,
  reviewAdminSwap,
  type AdminSwapItem,
  type AdminSwapLedger,
} from "@/lib/swapsApi";
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

export default function SwapsReview() {
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [ledgerRange, setLedgerRange] = useState<"7d" | "30d" | "all">("30d");
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "EARLIER" | "LATER">("ALL");
  const [items, setItems] = useState<AdminSwapItem[]>([]);
  const [ledger, setLedger] = useState<AdminSwapLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const pageSize = 10;

  const [reviewOpen, setReviewOpen] = useState(false);
  const [active, setActive] = useState<AdminSwapItem | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

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

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (directionFilter === "EARLIER" && item.toPosition >= item.fromPosition) return false;
      if (directionFilter === "LATER" && item.toPosition <= item.fromPosition) return false;
      if (!query) return true;
      const text = [
        item.user.fullName,
        item.user.email,
        item.plan.name,
        String(item.fromPosition),
        String(item.toPosition),
        String(item.feeCharged),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [items, search, directionFilter]);

  const stats = useMemo(() => {
    return {
      submitted: filteredItems.filter((item) => item.status === "SUBMITTED").length,
      approved: ledger?.counts.approvedSwaps ?? 0,
      pending: ledger?.counts.pendingSwaps ?? 0,
      fees: ledger?.totals.totalFeesCollected ?? 0,
    };
  }, [filteredItems, ledger]);

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
  }, [status, ledgerRange, search, directionFilter]);

  const hasActiveFilters =
    Boolean(search.trim()) || status !== "SUBMITTED" || ledgerRange !== "30d" || directionFilter !== "ALL";

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((x) => x !== id);
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
      toast.error("Select at least one submitted swap first.");
      return;
    }
    setBulkSaving(true);
    try {
      await Promise.all(selectedIds.map((id) => reviewAdminSwap(id, { decision: nextDecision })));
      toast.success(`Bulk ${nextDecision === "APPROVE" ? "approval" : "rejection"} completed.`);
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to process selected swaps");
    } finally {
      setBulkSaving(false);
    }
  }

  function requestBulkReview(nextDecision: "APPROVE" | "REJECT") {
    if (selectedIds.length === 0) {
      toast.error("Select at least one submitted swap first.");
      return;
    }
    setBulkDecision(nextDecision);
    setBulkConfirmOpen(true);
  }

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
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Swap requests</h1>
        <p className="text-sm text-slate-500">Approve or reject position swap requests and track fee performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Visible requests" value={items.length} hint="Current request list size" icon={ArrowLeftRight} />
        <SummaryTile label="Pending exposure" value={ledger?.totals.pendingExposure ?? 0} hint={`${stats.pending} submitted swaps`} icon={Clock3} />
        <SummaryTile label="Fees collected" value={stats.fees} hint="Approved swap charges posted" icon={Coins} />
        <SummaryTile label="Approved swaps" value={stats.approved} hint={`Rejected ${ledger?.counts.rejectedSwaps ?? 0}`} icon={ShieldCheck} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-slate-950">Swap ledger and review queue</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Filter swap requests and monitor monetization trend by date range.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminQueueFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search user, plan or positions"
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
                <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as "ALL" | "EARLIER" | "LATER")}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All directions</SelectItem>
                    <SelectItem value="EARLIER">Move earlier</SelectItem>
                    <SelectItem value="LATER">Move later</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ledgerRange} onValueChange={(v) => setLedgerRange(v as "7d" | "30d" | "all")}>
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
              `Direction: ${directionFilter === "ALL" ? "All directions" : directionFilter === "EARLIER" ? "Move earlier" : "Move later"}`,
              `Window: ${ledgerRange === "all" ? "All time" : ledgerRange === "7d" ? "Last 7d" : "Last 30d"}`,
              `Results: ${filteredItems.length}`,
            ]}
            onClear={() => {
              setSearch("");
              setStatus("SUBMITTED");
              setDirectionFilter("ALL");
              setLedgerRange("30d");
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

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-sky-50/50 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Fees collected</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{ledger?.totals.totalFeesCollected ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">Approved swap charges posted</div>
            </div>
            <div className="rounded-xl border bg-amber-50/50 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Pending exposure</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{ledger?.totals.pendingExposure ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">{ledger?.counts.pendingSwaps ?? 0} requests awaiting decision</div>
            </div>
            <div className="rounded-xl border bg-emerald-50/50 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Approved swaps</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{ledger?.counts.approvedSwaps ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">Rejected {ledger?.counts.rejectedSwaps ?? 0}</div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-slate-500">Loading swap requests…</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No swap requests found for this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {pagedItems.map((swap) => (
                <div
                  key={swap.id}
                  className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {swap.status === "SUBMITTED" ? (
                        <label className="mr-1 inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(swap.id)}
                            onChange={(e) => toggleSelection(swap.id, e.target.checked)}
                          />
                        </label>
                      ) : null}
                      <div className="font-medium text-slate-950">{swap.user.fullName || swap.user.email}</div>
                      <Badge variant={swap.status === "SUBMITTED" ? "secondary" : swap.status === "APPROVED" ? "default" : "destructive"}>
                        {swap.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {swap.plan.name} • Move {swap.fromPosition} → {swap.toPosition} • {swap.steps} step(s)
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Current position {swap.plan.assignedPosition} • Current cycle {swap.plan.currentCycleIndex + 1} • Fee {swap.feeCharged}
                    </div>
                  </div>

                  {swap.status === "SUBMITTED" ? (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button onClick={() => openReview(swap, "APPROVE")}>Approve</Button>
                      <Button variant="outline" onClick={() => openReview(swap, "REJECT")}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
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
            <DialogTitle>{decision === "APPROVE" ? "Approve swap request" : "Reject swap request"}</DialogTitle>
            <DialogDescription>
              {decision === "APPROVE"
                ? "Approving will update the payout position and increment swap usage."
                : "Reject this request and keep the current payout position unchanged."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {active ? (
              <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">{active.user.fullName || active.user.email}</div>
                <div className="mt-1">{active.plan.name} • Move {active.fromPosition} → {active.toPosition}</div>
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
                {saving ? "Saving..." : decision === "APPROVE" ? "Approve swap" : "Reject swap"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{bulkDecision === "APPROVE" ? "Bulk approve swaps" : "Bulk reject swaps"}</DialogTitle>
            <DialogDescription>
              {bulkDecision === "APPROVE"
                ? `Approve ${selectedIds.length} selected swap request${selectedIds.length > 1 ? "s" : ""}.`
                : `Reject ${selectedIds.length} selected swap request${selectedIds.length > 1 ? "s" : ""}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-900">Selected swap requests</div>
            <div className="mt-1">{selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} in the current queue.</div>
            <div className="mt-2 text-xs text-slate-500">
              {bulkDecision === "APPROVE"
                ? "Approvals will update assigned positions and can bring payouts forward immediately."
                : "Rejections will leave current payout positions and fee exposure unchanged."}
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
