import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Clock3, PauseCircle, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { AdminQueueFilterBar } from "@/components/admin/AdminQueueFilterBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAdminPauses, reviewAdminPause, type AdminPauseItem } from "@/lib/planPausesApi";

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

export default function PausesReview() {
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [search, setSearch] = useState("");
  const [durationFilter, setDurationFilter] = useState<"ALL" | "ONE_MONTH" | "MULTI_MONTH">("ALL");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [items, setItems] = useState<AdminPauseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [active, setActive] = useState<AdminPauseItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [bulkDecision, setBulkDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

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

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return items.filter((item) => {
      if (durationFilter === "ONE_MONTH" && item.months !== 1) return false;
      if (durationFilter === "MULTI_MONTH" && item.months <= 1) return false;
      if (
        dateRange !== "all" &&
        now - new Date(item.createdAt).getTime() > (dateRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (!query) return true;
      const text = [
        item.user.fullName,
        item.user.email,
        item.plan.name,
        item.paymentRef,
        String(item.months),
        String(item.totalFee),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [items, search, durationFilter, dateRange]);

  const stats = useMemo(() => {
    return {
      submitted: filteredItems.filter((item) => item.status === "SUBMITTED").length,
      approved: filteredItems.filter((item) => item.status === "APPROVED").length,
      rejected: filteredItems.filter((item) => item.status === "REJECTED").length,
      fees: filteredItems.reduce((sum, item) => sum + Number(item.totalFee || 0), 0),
    };
  }, [filteredItems]);

  const pageSize = 10;
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
  }, [status, search, durationFilter, dateRange]);

  const hasActiveFilters =
    Boolean(search.trim()) || status !== "SUBMITTED" || durationFilter !== "ALL" || dateRange !== "30d";

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
      toast.error("Select at least one submitted pause request first.");
      return;
    }
    setBulkSaving(true);
    try {
      await Promise.all(selectedIds.map((id) => reviewAdminPause(id, { decision: nextDecision })));
      toast.success(`Bulk ${nextDecision === "APPROVE" ? "approval" : "rejection"} completed.`);
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to process selected pause requests");
    } finally {
      setBulkSaving(false);
    }
  }

  function requestBulkReview(nextDecision: "APPROVE" | "REJECT") {
    if (selectedIds.length === 0) {
      toast.error("Select at least one submitted pause request first.");
      return;
    }
    setBulkDecision(nextDecision);
    setBulkConfirmOpen(true);
  }

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
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Pause requests</h1>
        <p className="text-sm text-slate-500">Approve or reject post-payout pause requests and confirm pause fee handling.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Visible requests" value={items.length} hint="Current list result count" icon={PauseCircle} />
        <SummaryTile label="Submitted" value={stats.submitted} hint="Awaiting review" icon={Clock3} />
        <SummaryTile label="Approved" value={stats.approved} hint="Pause cycles now posted" icon={ShieldCheck} />
        <SummaryTile label="Visible fee total" value={stats.fees} hint="Combined fee amount in current view" icon={WalletCards} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-slate-950">Pause review queue</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Filter pause requests and review requests submitted after payout eligibility.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <AdminQueueFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search user, plan or payment ref"
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
                <Select value={durationFilter} onValueChange={(v) => setDurationFilter(v as "ALL" | "ONE_MONTH" | "MULTI_MONTH")}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All durations</SelectItem>
                    <SelectItem value="ONE_MONTH">1 month</SelectItem>
                    <SelectItem value="MULTI_MONTH">2+ months</SelectItem>
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
              `Duration: ${durationFilter === "ALL" ? "All durations" : durationFilter === "ONE_MONTH" ? "1 month" : "2+ months"}`,
              `Window: ${dateRange === "all" ? "All time" : dateRange === "7d" ? "Last 7d" : "Last 30d"}`,
              `Results: ${filteredItems.length}`,
            ]}
            onClear={() => {
              setSearch("");
              setStatus("SUBMITTED");
              setDurationFilter("ALL");
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
            <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-slate-500">Loading pause requests…</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No pause requests found for this filter.
            </div>
          ) : (
            pagedItems.map((pause) => (
              <div
                key={pause.id}
                className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {pause.status === "SUBMITTED" ? (
                      <label className="mr-1 inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(pause.id)}
                          onChange={(e) => toggleSelection(pause.id, e.target.checked)}
                        />
                      </label>
                    ) : null}
                    <div className="font-medium text-slate-950">{pause.user.fullName || pause.user.email}</div>
                    <Badge variant={pause.status === "APPROVED" ? "default" : pause.status === "REJECTED" ? "destructive" : "secondary"}>
                      {pause.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {pause.plan.name} • Cycles {pause.startCycleIndex + 1}-{pause.endCycleIndex + 1} • {pause.months} month(s)
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Fee {pause.totalFee} • Ref {pause.paymentRef || "—"} • Submitted {new Date(pause.createdAt).toLocaleString()}
                  </div>
                </div>

                {pause.status === "SUBMITTED" ? (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button onClick={() => openReview(pause, "APPROVE")}>Approve</Button>
                    <Button variant="outline" onClick={() => openReview(pause, "REJECT")}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{decision === "APPROVE" ? "Approve pause request" : "Reject pause request"}</DialogTitle>
            <DialogDescription>
              {decision === "APPROVE"
                ? "Approving will post paused status for the selected future cycles."
                : "Rejecting keeps the contribution schedule unchanged."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {active ? (
              <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">{active.user.fullName || active.user.email}</div>
                <div className="mt-1">{active.plan.name} • {active.months} month(s) • Fee {active.totalFee}</div>
              </div>
            ) : null}
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

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{bulkDecision === "APPROVE" ? "Bulk approve pauses" : "Bulk reject pauses"}</DialogTitle>
            <DialogDescription>
              {bulkDecision === "APPROVE"
                ? `Approve ${selectedIds.length} selected pause request${selectedIds.length > 1 ? "s" : ""}.`
                : `Reject ${selectedIds.length} selected pause request${selectedIds.length > 1 ? "s" : ""}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-900">Selected pause requests</div>
            <div className="mt-1">{selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} in the current queue.</div>
            <div className="mt-2 text-xs text-slate-500">
              {bulkDecision === "APPROVE"
                ? "Approvals will post paused future cycles and accept the requested fee handling."
                : "Rejections will keep the contribution schedule unchanged for those plans."}
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
