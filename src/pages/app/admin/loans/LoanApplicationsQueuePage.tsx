import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock3, Download, HandCoins, Info } from "lucide-react";
import { toast } from "sonner";

import { disburseAdminLoanApplication, listAdminLoanApplications, reviewAdminLoanApplication } from "@/lib/adminLoansApi";
import { downloadLoanDocument, type LoanApplication } from "@/lib/loansApi";
import { AdminQueueFilterBar } from "@/components/admin/AdminQueueFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SummaryTile, formatDate, formatMoney, loanStatusTone } from "./shared";

export default function LoanApplicationsQueuePage() {
  const [status, setStatus] = useState<"SUBMITTED" | "MORE_INFO_REQUIRED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [items, setItems] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [reviewOpen, setReviewOpen] = useState(false);
  const [active, setActive] = useState<LoanApplication | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | "REQUEST_INFO">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvedTermMonths, setApprovedTermMonths] = useState("");
  const [saving, setSaving] = useState(false);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [disburseAmount, setDisburseAmount] = useState("");
  const [repaymentStartDate, setRepaymentStartDate] = useState("");
  const [disbursementRef, setDisbursementRef] = useState("");
  const [disbursementNote, setDisbursementNote] = useState("");
  const [disburseSaving, setDisburseSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminLoanApplications(status);
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan applications");
      setItems([]);
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
      if (productFilter !== "ALL" && item.product.id !== productFilter) return false;
      if (
        dateRange !== "all" &&
        now - new Date(item.submittedAt).getTime() > (dateRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (!query) return true;
      const text = [item.user?.fullName, item.user?.email, item.product.name, item.purpose, item.reviewNote]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [items, search, productFilter, dateRange]);

  const stats = useMemo(() => {
    const submitted = filteredItems.filter((item) => item.status === "SUBMITTED").length;
    const approved = filteredItems.filter((item) => item.status === "APPROVED").length;
    const info = filteredItems.filter((item) => item.status === "MORE_INFO_REQUIRED").length;
    const blocked = filteredItems.filter((item) => !item.equity.canApprove).length;
    return { submitted, approved, info, blocked };
  }, [filteredItems]);

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(item.product.id, item.product.name);
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  const hasActiveFilters = Boolean(search.trim()) || status !== "SUBMITTED" || productFilter !== "ALL" || dateRange !== "30d";

  useEffect(() => {
    setPage(1);
  }, [search, status, productFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  function openReview(item: LoanApplication, nextDecision: "APPROVE" | "REJECT" | "REQUEST_INFO") {
    setActive(item);
    setDecision(nextDecision);
    setReviewNote(item.reviewNote || "");
    setApprovedAmount(String(item.approvedAmount ?? item.amountRequested));
    setApprovedTermMonths(String(item.approvedTermMonths ?? item.termMonths));
    setReviewOpen(true);
  }

  function openDisburse(item: LoanApplication) {
    setActive(item);
    setDisburseAmount(String(item.disbursedAmount ?? item.approvedAmount ?? item.amountRequested));
    setRepaymentStartDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setDisbursementRef("");
    setDisbursementNote("");
    setDisburseOpen(true);
  }

  async function submitReview() {
    if (!active) return;
    if (reviewNote.trim().length < 3) {
      toast.error("Add a short review note before submitting.");
      return;
    }

    setSaving(true);
    try {
      await reviewAdminLoanApplication(active.id, {
        decision,
        reviewNote: reviewNote.trim(),
        approvedAmount: decision === "APPROVE" ? Number(approvedAmount) : undefined,
        approvedTermMonths: decision === "APPROVE" ? Number(approvedTermMonths) : undefined,
      });
      toast.success("Loan application updated.");
      setReviewOpen(false);
      setActive(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to review loan application");
    } finally {
      setSaving(false);
    }
  }

  async function submitDisbursement() {
    if (!active) return;
    if (!repaymentStartDate) {
      toast.error("Choose the first repayment date.");
      return;
    }

    setDisburseSaving(true);
    try {
      await disburseAdminLoanApplication(active.id, {
        disbursedAmount: disburseAmount ? Number(disburseAmount) : undefined,
        repaymentStartDate,
        disbursementRef: disbursementRef.trim() || undefined,
        note: disbursementNote.trim() || undefined,
      });
      toast.success("Loan disbursed and repayment schedule created.");
      setDisburseOpen(false);
      setActive(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to disburse loan");
    } finally {
      setDisburseSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Loan application queue</h1>
        <p className="text-sm text-slate-500">Review submitted applications, inspect documents, and move each request to the next clear decision.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Submitted" value={stats.submitted} hint="Waiting for admin action" icon={Clock3} />
        <SummaryTile label="Approved" value={stats.approved} hint="Reviewed positively" icon={BadgeCheck} />
        <SummaryTile label="More info" value={stats.info} hint="Needs customer response" icon={Info} />
        <SummaryTile label="Equity blocked" value={stats.blocked} hint="Still waiting on full equity funding" icon={HandCoins} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-base">Review queue</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Filter by status, product, or search by borrower name, email, and purpose.</p>
          </div>
          <AdminQueueFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search borrower, product, or purpose"
            filters={
              <>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger className="w-full bg-white sm:w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="MORE_INFO_REQUIRED">More info</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="ALL">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-full bg-white sm:w-[190px]"><SelectValue placeholder="Product" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All products</SelectItem>
                    {productOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRange)}>
                  <SelectTrigger className="w-full bg-white sm:w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7d</SelectItem>
                    <SelectItem value="30d">Last 30d</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            badges={[
              `Status: ${status === "ALL" ? "All" : status.replaceAll("_", " ")}`,
              productFilter === "ALL" ? "Product: All" : `Product: ${productOptions.find((item) => item.value === productFilter)?.label || "Selected"}`,
              dateRange === "all" ? "Range: All time" : `Range: ${dateRange === "7d" ? "Last 7d" : "Last 30d"}`,
            ]}
            onClear={() => {
              setSearch("");
              setStatus("SUBMITTED");
              setProductFilter("ALL");
              setDateRange("30d");
            }}
            canClear={hasActiveFilters}
            onRefresh={load}
            refreshing={loading}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading loan queue...</div>
          ) : pagedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No loan applications match the current filters.</div>
          ) : (
            pagedItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-slate-950">{item.user?.fullName || item.user?.email}</div>
                      <Badge className={loanStatusTone(item.status)}>{item.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <div className="text-sm text-slate-500">{item.product.name} · {formatMoney(item.amountRequested, item.product.currency)} · {item.termMonths} months</div>
                    <div className="text-sm text-slate-700">{item.purpose}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === "SUBMITTED" ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openReview(item, "REQUEST_INFO")}>Request info</Button>
                        <Button variant="outline" size="sm" onClick={() => openReview(item, "REJECT")}>Reject</Button>
                        <Button size="sm" onClick={() => openReview(item, "APPROVE")} disabled={!item.equity.canApprove}>Approve</Button>
                      </>
                    ) : null}
                    {item.status === "APPROVED" && !item.disbursedAt ? (
                      <Button size="sm" onClick={() => openDisburse(item)}>Disburse</Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Borrower</div><div className="mt-1 font-medium text-slate-900">{item.user?.email || "-"}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Submitted</div><div className="mt-1 font-medium text-slate-900">{formatDate(item.submittedAt)}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Income snapshot</div><div className="mt-1 font-medium text-slate-900">{item.monthlyIncomeSnapshot != null ? formatMoney(item.monthlyIncomeSnapshot) : "-"}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Expense snapshot</div><div className="mt-1 font-medium text-slate-900">{item.monthlyExpenseSnapshot != null ? formatMoney(item.monthlyExpenseSnapshot) : "-"}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Required equity</div><div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.requiredAmount, item.product.currency)}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Confirmed equity</div><div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.confirmedAmount, item.product.currency)}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Remaining equity</div><div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.remainingAmount, item.product.currency)}</div></div>
                </div>

                {(item.employmentStatus || item.employerName || item.businessName) ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Profile context:</span> {[item.employmentStatus, item.employerName, item.businessName].filter(Boolean).join(" · ")}
                  </div>
                ) : null}

                {!item.equity.canApprove ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Approval is blocked until the borrower fully funds the required equity.</div>
                ) : null}

                {item.reviewNote ? (
                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Latest admin note</div>
                    <div className="mt-1">{item.reviewNote}</div>
                  </div>
                ) : null}

                {item.disbursedAt ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
                    <div className="font-medium">Disbursed</div>
                    <div className="mt-1">
                      {formatMoney(item.disbursedAmount || item.approvedAmount || item.amountRequested, item.product.currency)} sent on {formatDate(item.disbursedAt)}
                      {item.disbursementRef ? ` • Ref ${item.disbursementRef}` : ""}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-slate-900">Documents</div>
                  {item.documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No documents uploaded.</div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {item.documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">{document.originalName}</div>
                            <div className="text-xs text-slate-500">{document.documentType.replaceAll("_", " ")} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => downloadLoanDocument(item.id, document.id, document.originalName)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {item.updates.length ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-slate-900">Application timeline</div>
                    <div className="space-y-2">
                      {item.updates.map((update) => (
                        <div key={update.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-slate-900">{update.title}</div>
                              <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{update.actorType}</div>
                            </div>
                            <div className="text-xs text-slate-500">{formatDate(update.createdAt)}</div>
                          </div>
                          {update.note ? <div className="mt-2 text-slate-600">{update.note}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-sm text-slate-500">Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review loan application</DialogTitle>
            <DialogDescription>Record a clear admin decision so the customer understands the next step immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(value) => setDecision(value as typeof decision)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">Approve</SelectItem>
                  <SelectItem value="REQUEST_INFO">Request more info</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {decision === "APPROVE" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Approved amount</Label>
                  <input
                    className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Approved term (months)</Label>
                  <input
                    className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                    value={approvedTermMonths}
                    onChange={(e) => setApprovedTermMonths(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Review note</Label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Explain the approval, rejection, or the exact information the customer still needs."
              />
            </div>
            {active ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">{active.user?.fullName || active.user?.email}</div>
                <div className="mt-1">{active.product.name} · {formatMoney(active.amountRequested, active.product.currency)} · {active.termMonths} months</div>
                <div className="mt-1">Equity funded: {formatMoney(active.equity.confirmedAmount, active.product.currency)} / {formatMoney(active.equity.requiredAmount, active.product.currency)}</div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={submitReview} disabled={saving}>{saving ? "Saving..." : "Save decision"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disburseOpen} onOpenChange={setDisburseOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Disburse approved loan</DialogTitle>
            <DialogDescription>Post the disbursement and generate the live repayment schedule in one step.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Disbursed amount</Label>
                <input
                  className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label>First repayment date</Label>
                <input
                  type="date"
                  className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                  value={repaymentStartDate}
                  onChange={(e) => setRepaymentStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Disbursement reference</Label>
              <input
                className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                value={disbursementRef}
                onChange={(e) => setDisbursementRef(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <textarea
                className="min-h-24 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={disbursementNote}
                onChange={(e) => setDisbursementNote(e.target.value)}
                placeholder="Optional internal note for this disbursement."
              />
            </div>
            {active ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">{active.user?.fullName || active.user?.email}</div>
                <div className="mt-1">
                  Approved: {formatMoney(active.approvedAmount || active.amountRequested, active.product.currency)} over {active.approvedTermMonths || active.termMonths} months
                </div>
                <div className="mt-1">
                  Rate {(Number(active.annualInterestRatePct ?? active.product.annualInterestRatePct ?? 0) * 100).toFixed(2)}% • Fee {(Number(active.processingFeePct ?? active.product.processingFeePct ?? 0) * 100).toFixed(2)}%
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseOpen(false)}>Cancel</Button>
            <Button onClick={submitDisbursement} disabled={disburseSaving}>
              {disburseSaving ? "Posting..." : "Post disbursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
