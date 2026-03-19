import { useEffect, useMemo, useState } from "react";
import { Clock3, Landmark, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getLoanRepaymentPaymentOptions,
  listLoanApplications,
  listLoanTransactions,
  submitLoanRepaymentGatewayPayment,
  submitLoanRepaymentManualPayment,
  type LoanApplication,
  type LoanRepaymentInstallment,
  type LoanTransaction,
} from "@/lib/loansApi";

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n || 0));
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function LoanRepaymentsPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeApplication, setActiveApplication] = useState<LoanApplication | null>(null);
  const [activeInstallment, setActiveInstallment] = useState<LoanRepaymentInstallment | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ code: "STRIPE_CARD" | "BANK_TRANSFER_MANUAL"; label: string; description: string; submissionMode: "GATEWAY" | "BANK_TRANSFER" }>
  >([]);
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE_CARD" | "BANK_TRANSFER_MANUAL">("STRIPE_CARD");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [applicationsRes, transactionsRes] = await Promise.all([listLoanApplications(), listLoanTransactions()]);
      setApplications(applicationsRes.items || []);
      setTransactions(transactionsRes.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load repayments");
      setApplications([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openPaymentDialog(application: LoanApplication, installment: LoanRepaymentInstallment) {
    try {
      const optionsRes = await getLoanRepaymentPaymentOptions(installment.id);
      setPaymentMethods(optionsRes.methods || []);
      if (optionsRes.methods?.length) {
        setPaymentMethod(optionsRes.methods[0].code);
      }
      setActiveApplication(application);
      setActiveInstallment(installment);
      setPaymentAmount(String(installment.outstandingAmount.toFixed(2)));
      setPaymentReference("");
      setPaymentNote("");
      setPaymentOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load repayment payment options");
    }
  }

  async function submitPayment() {
    if (!activeApplication || !activeInstallment) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid repayment amount.");
      return;
    }
    if (amount > Number(activeInstallment.outstandingAmount || 0) + 0.01) {
      toast.error("Amount exceeds the remaining installment balance.");
      return;
    }

    const selectedMethod = paymentMethods.find((item) => item.code === paymentMethod);

    setSubmitting(true);
    try {
      if (selectedMethod?.submissionMode === "BANK_TRANSFER") {
        if (!paymentReference.trim()) {
          toast.error("Enter your transfer reference.");
          return;
        }
        await submitLoanRepaymentManualPayment(activeInstallment.id, {
          amount,
          userReference: paymentReference.trim(),
          note: paymentNote.trim() || undefined,
        });
        toast.success("Manual repayment submitted for admin confirmation.");
      } else {
        await submitLoanRepaymentGatewayPayment(activeInstallment.id, {
          amount,
          providerRef: paymentReference.trim() || undefined,
          note: paymentNote.trim() || undefined,
        });
        toast.success("Repayment payment confirmed.");
      }

      setPaymentOpen(false);
      setActiveApplication(null);
      setActiveInstallment(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit repayment payment");
    } finally {
      setSubmitting(false);
    }
  }

  const liveFacilities = useMemo(
    () => applications.filter((item) => item.disbursedAt || item.repaymentSchedule.length > 0),
    [applications]
  );

  const repaymentSummary = useMemo(() => {
    let totalPaid = 0;
    let totalOutstanding = 0;
    let nextDueAmount = 0;
    let nextDueDate: string | null = null;

    for (const item of liveFacilities) {
      totalPaid += Number(item.repaymentSummary.totalPaid || 0);
      totalOutstanding += Number(item.repaymentSummary.outstandingBalance || 0);
      const dueDate = item.repaymentSummary.nextDueDate;
      if (!dueDate) continue;
      if (!nextDueDate || new Date(dueDate).getTime() < new Date(nextDueDate).getTime()) {
        nextDueDate = dueDate;
        nextDueAmount = Number(item.repaymentSummary.nextDueAmount || 0);
      }
    }

    return {
      facilities: liveFacilities.length,
      totalPaid,
      totalOutstanding,
      nextDueDate,
      nextDueAmount,
    };
  }, [liveFacilities]);

  const alertSummary = useMemo(() => {
    const now = Date.now();
    const upcomingWindow = now + 7 * 24 * 60 * 60 * 1000;
    let overdueInstallments = 0;
    let dueSoonFacilities = 0;
    let pendingManualReviews = 0;

    for (const item of liveFacilities) {
      overdueInstallments += Number(item.repaymentSummary.overdueCount || 0);
      pendingManualReviews += item.repaymentPayments.filter((payment) => payment.status === "SUBMITTED").length;
      const nextDueDate = item.repaymentSummary.nextDueDate ? new Date(item.repaymentSummary.nextDueDate).getTime() : null;
      if (nextDueDate && nextDueDate >= now && nextDueDate <= upcomingWindow) {
        dueSoonFacilities += 1;
      }
    }

    return { overdueInstallments, dueSoonFacilities, pendingManualReviews };
  }, [liveFacilities]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Repayments</h1>
          <p className="text-sm text-slate-500">
            Track disbursed loans, see your upcoming installments, and review the posted lending ledger in one place.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm text-slate-500">Live facilities</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{repaymentSummary.facilities}</div>
            </div>
            <Landmark className="h-6 w-6 text-indigo-700" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm text-slate-500">Total repaid</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{formatMoney(repaymentSummary.totalPaid)}</div>
            </div>
            <WalletCards className="h-6 w-6 text-indigo-700" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm text-slate-500">Outstanding balance</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{formatMoney(repaymentSummary.totalOutstanding)}</div>
            </div>
            <Clock3 className="h-6 w-6 text-indigo-700" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm text-slate-500">Next due</div>
              <div className="mt-2 text-xl font-semibold text-slate-950">{formatMoney(repaymentSummary.nextDueAmount)}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDate(repaymentSummary.nextDueDate)}</div>
            </div>
            <Clock3 className="h-6 w-6 text-indigo-700" />
          </CardContent>
        </Card>
      </div>

      {(alertSummary.overdueInstallments > 0 || alertSummary.dueSoonFacilities > 0 || alertSummary.pendingManualReviews > 0) ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-rose-200 bg-rose-50/70 shadow-sm dashboard-card">
            <CardContent className="p-5">
              <div className="text-sm text-rose-700">Overdue now</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{alertSummary.overdueInstallments}</div>
              <div className="mt-1 text-xs text-slate-500">Installments that need immediate attention.</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-amber-200 bg-amber-50/70 shadow-sm dashboard-card">
            <CardContent className="p-5">
              <div className="text-sm text-amber-700">Due within 7 days</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{alertSummary.dueSoonFacilities}</div>
              <div className="mt-1 text-xs text-slate-500">Facilities with an upcoming repayment date.</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-indigo-200 bg-indigo-50/70 shadow-sm dashboard-card">
            <CardContent className="p-5">
              <div className="text-sm text-indigo-700">Pending admin confirmation</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{alertSummary.pendingManualReviews}</div>
              <div className="mt-1 text-xs text-slate-500">Manual repayment submissions still awaiting review.</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader>
          <CardTitle>Repayment facilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading repayment facilities...</div>
          ) : liveFacilities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No disbursed loan yet. Once a loan is funded, the full repayment schedule will appear here automatically.
            </div>
          ) : (
            liveFacilities.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-950">{item.product.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Disbursed {formatMoney(item.disbursedAmount || item.approvedAmount || item.amountRequested, item.product.currency)} • {item.approvedTermMonths || item.termMonths} months
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Ref {item.disbursementRef || "-"} • First due {formatDate(item.repaymentStartDate)}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Annual rate</div>
                      <div className="mt-1 font-medium text-slate-900">{(Number(item.annualInterestRatePct || 0) * 100).toFixed(2)}%</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Outstanding</div>
                      <div className="mt-1 font-medium text-slate-900">{formatMoney(item.repaymentSummary.outstandingBalance, item.product.currency)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Overdue</div>
                      <div className="mt-1 font-medium text-slate-900">{item.repaymentSummary.overdueCount}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">No.</th>
                        <th className="px-4 py-3 text-left font-medium">Due date</th>
                        <th className="px-4 py-3 text-right font-medium">Principal</th>
                        <th className="px-4 py-3 text-right font-medium">Interest</th>
                        <th className="px-4 py-3 text-right font-medium">Fee</th>
                        <th className="px-4 py-3 text-right font-medium">Total due</th>
                        <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.repaymentSchedule.map((row) => {
                        const pendingManual = item.repaymentPayments.find(
                          (payment) => payment.installmentId === row.id && payment.status === "SUBMITTED"
                        );
                        return (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-4 py-3">{row.installmentNumber}</td>
                            <td className="px-4 py-3">{formatDate(row.dueDate)}</td>
                            <td className="px-4 py-3 text-right">{formatMoney(row.principalAmount, item.product.currency)}</td>
                            <td className="px-4 py-3 text-right">{formatMoney(row.interestAmount, item.product.currency)}</td>
                            <td className="px-4 py-3 text-right">{formatMoney(row.feeAmount, item.product.currency)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatMoney(row.totalDue, item.product.currency)}</td>
                            <td className="px-4 py-3 text-right">{formatMoney(row.outstandingAmount, item.product.currency)}</td>
                            <td className="px-4 py-3">
                              <div>{row.status.replaceAll("_", " ")}</div>
                              {pendingManual ? (
                                <div className="text-xs text-amber-600">Manual review pending</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.outstandingAmount > 0 ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPaymentDialog(item, row)}
                                  disabled={Boolean(pendingManual)}
                                >
                                  Pay
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">Settled</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {(item.repaymentSummary.overdueCount > 0 || item.repaymentPayments.some((payment) => payment.status === "SUBMITTED")) ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {item.repaymentSummary.overdueCount > 0 ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900">
                        <div className="font-medium">Overdue reminder</div>
                        <div className="mt-1">
                          You currently have {item.repaymentSummary.overdueCount} overdue installment{item.repaymentSummary.overdueCount > 1 ? "s" : ""}. Paying them restores the schedule and reduces repayment risk.
                        </div>
                      </div>
                    ) : null}
                    {item.repaymentPayments.some((payment) => payment.status === "SUBMITTED") ? (
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 text-sm text-slate-700">
                        <div className="font-medium text-slate-900">Manual repayment under review</div>
                        <div className="mt-1">
                          A bank transfer submission is waiting for admin confirmation. The installment balance will update once it is approved.
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader>
          <CardTitle>Loan ledger activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading loan ledger...</div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No loan ledger activity has been posted yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Reference</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">{row.type.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.reference || row.id}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {row.direction === "DEBIT" ? "-" : "+"}
                        {formatMoney(row.amount, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pay installment</DialogTitle>
            <DialogDescription>
              Choose how you want to settle this installment. Gateway payments post immediately, while manual transfers wait for admin confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.code} value={method.code}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500">
                {paymentMethods.find((method) => method.code === paymentMethod)?.description || ""}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <input
                className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{paymentMethod === "BANK_TRANSFER_MANUAL" ? "Transfer reference" : "Provider reference"}</Label>
              <input
                className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={paymentMethod === "BANK_TRANSFER_MANUAL" ? "Enter your bank transfer reference" : "Optional gateway reference"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <textarea
                className="min-h-24 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Optional note for this repayment"
              />
            </div>
            {activeApplication && activeInstallment ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">{activeApplication.product.name}</div>
                <div className="mt-1">Installment {activeInstallment.installmentNumber} due {formatDate(activeInstallment.dueDate)}</div>
                <div className="mt-1">
                  Outstanding {formatMoney(activeInstallment.outstandingAmount, activeApplication.product.currency)}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={submitPayment} disabled={submitting}>
              {submitting ? "Submitting..." : paymentMethod === "BANK_TRANSFER_MANUAL" ? "Submit transfer" : "Pay now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
