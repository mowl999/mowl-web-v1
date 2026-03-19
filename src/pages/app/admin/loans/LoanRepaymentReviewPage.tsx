import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, WalletCards, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  listAdminLoanProducts,
  listAdminLoanRepaymentPayments,
  reviewAdminLoanRepaymentPayment,
  type AdminLoanRepaymentPayment,
} from "@/lib/adminLoansApi";
import { AdminQueueFilterBar } from "@/components/admin/AdminQueueFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SummaryTile, formatDate, formatMoney } from "./shared";

function repaymentPaymentTone(status: AdminLoanRepaymentPayment["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

export default function LoanRepaymentReviewPage() {
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [items, setItems] = useState<AdminLoanRepaymentPayment[]>([]);
  const [productOptions, setProductOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [active, setActive] = useState<AdminLoanRepaymentPayment | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, productsRes] = await Promise.all([
        listAdminLoanRepaymentPayments(status),
        listAdminLoanProducts(),
      ]);
      setItems(paymentsRes.items || []);
      setProductOptions((productsRes.items || []).map((item) => ({ value: item.id, label: item.name })));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan repayment review queue");
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
      if (productFilter !== "ALL" && item.application.product.id !== productFilter) return false;
      if (
        dateRange !== "all" &&
        now - new Date(item.submittedAt).getTime() > (dateRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (!query) return true;
      const text = [
        item.user?.fullName,
        item.user?.email,
        item.application.product.name,
        item.userReference,
        item.providerRef,
        item.note,
        `installment ${item.installment.installmentNumber}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [items, search, productFilter, dateRange]);

  const totals = useMemo(() => {
    const pendingCount = filteredItems.filter((item) => item.status === "SUBMITTED").length;
    const approvedCount = filteredItems.filter((item) => item.status === "APPROVED").length;
    const rejectedCount = filteredItems.filter((item) => item.status === "REJECTED").length;
    const confirmedAmount = filteredItems
      .filter((item) => item.status === "APPROVED")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { pendingCount, approvedCount, rejectedCount, confirmedAmount };
  }, [filteredItems]);

  const hasActiveFilters = Boolean(search.trim()) || status !== "SUBMITTED" || productFilter !== "ALL" || dateRange !== "30d";

  function openReview(item: AdminLoanRepaymentPayment, nextDecision: "APPROVE" | "REJECT") {
    setActive(item);
    setDecision(nextDecision);
    setReviewNote(item.reviewNote || item.note || "");
    setPaymentRef(item.providerRef || item.userReference || "");
    setReviewOpen(true);
  }

  async function submitReview() {
    if (!active) return;
    if (decision === "REJECT" && reviewNote.trim().length < 3) {
      toast.error("Add a short note so the user understands why the repayment was rejected.");
      return;
    }
    if (decision === "APPROVE" && paymentRef.trim().length < 3) {
      toast.error("Enter a payment reference before approving this repayment.");
      return;
    }

    setSaving(true);
    try {
      await reviewAdminLoanRepaymentPayment(active.id, {
        decision,
        reviewNote: reviewNote.trim() || undefined,
        paymentRef: decision === "APPROVE" ? paymentRef.trim() : undefined,
      });
      toast.success(decision === "APPROVE" ? "Repayment approved." : "Repayment rejected.");
      setReviewOpen(false);
      setActive(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to review repayment payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Admin Console</div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Loan repayment review</h1>
        <p className="text-sm text-slate-500">Approve manual loan repayments so installment balances reduce correctly and the borrower ledger stays current.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Pending" value={totals.pendingCount} hint="Manual repayments awaiting review" icon={Clock3} />
        <SummaryTile label="Approved" value={totals.approvedCount} hint="Repayments posted to installment balances" icon={CheckCircle2} />
        <SummaryTile label="Rejected" value={totals.rejectedCount} hint="Repayments not accepted" icon={XCircle} />
        <SummaryTile label="Confirmed amount" value={formatMoney(totals.confirmedAmount)} hint="Approved repayments across filtered items" icon={WalletCards} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-base">Repayment review queue</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Filter by status, product, or borrower so manual loan repayments can be confirmed quickly.</p>
          </div>
          <AdminQueueFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search borrower, product, installment, or payment reference"
            filters={
              <>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger className="w-full bg-white sm:w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
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
              `Status: ${status === "ALL" ? "All" : status}`,
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
            <div className="text-sm text-slate-500">Loading repayment review queue...</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No repayment payments match the current filters.</div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-slate-950">{item.user?.fullName || item.user?.email}</div>
                      <Badge className={repaymentPaymentTone(item.status)}>{item.status}</Badge>
                    </div>
                    <div className="text-sm text-slate-500">{item.application.product.name} · Installment {item.installment.installmentNumber} · {formatMoney(item.amount, item.currency)}</div>
                    <div className="text-sm text-slate-700">Reference: {item.userReference || item.providerRef || "-"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === "SUBMITTED" ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openReview(item, "REJECT")}>Reject</Button>
                        <Button size="sm" onClick={() => openReview(item, "APPROVE")}>Approve</Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Installment due</div><div className="mt-1 font-medium text-slate-900">{formatMoney(item.installment.totalDue, item.application.product.currency)}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Paid so far</div><div className="mt-1 font-medium text-slate-900">{formatMoney(item.installment.amountPaid, item.application.product.currency)}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Outstanding</div><div className="mt-1 font-medium text-slate-900">{formatMoney(item.installment.outstandingAmount, item.application.product.currency)}</div></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm"><div className="text-xs uppercase tracking-wide text-slate-400">Due date</div><div className="mt-1 font-medium text-slate-900">{formatDate(item.installment.dueDate)}</div></div>
                </div>

                {item.note ? (
                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Customer note</div>
                    <div className="mt-1">{item.note}</div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review repayment payment</DialogTitle>
            <DialogDescription>Confirm or reject this transfer so the installment balance and loan ledger remain accurate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(value) => setDecision(value as typeof decision)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">Approve</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {decision === "APPROVE" ? (
              <div className="space-y-1.5">
                <Label>Payment reference</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Reference to attach to the repayment" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Review note</Label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Explain the approval or rejection clearly for operations history."
              />
            </div>
            {active ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1.5">
                <div className="font-medium text-slate-900">{active.user?.fullName || active.user?.email}</div>
                <div>{active.application.product.name} · Installment {active.installment.installmentNumber}</div>
                <div>{formatMoney(active.amount, active.currency)} submitted {formatDate(active.submittedAt)}</div>
                <div>Outstanding before approval: {formatMoney(active.installment.outstandingAmount, active.application.product.currency)}</div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={submitReview} disabled={saving}>{saving ? "Saving..." : "Save review"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
