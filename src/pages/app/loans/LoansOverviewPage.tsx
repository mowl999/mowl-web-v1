import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, HandCoins, Landmark, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dismissLoanReminder,
  listDismissedLoanReminders,
  listLoanApplications,
  listLoanProducts,
  listLoanReminders,
  markAllLoanRemindersRead,
  markLoanReminderRead,
  markLoanReminderUnread,
  restoreLoanReminder,
  type LoanApplication,
  type LoanProduct,
  type UserNotification,
} from "@/lib/loansApi";

function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function statusTone(status: LoanApplication["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "MORE_INFO_REQUIRED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "SUBMITTED") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusLabel(status: LoanApplication["status"]) {
  if (status === "MORE_INFO_REQUIRED") return "More info required";
  return status.replaceAll("_", " ");
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
      <CardContent className="p-5">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{hint}</div>
      </CardContent>
    </Card>
  );
}

export default function LoansOverviewPage() {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [reminders, setReminders] = useState<UserNotification[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reminderActionId, setReminderActionId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [productsRes, applicationsRes, remindersRes, dismissedRes] = await Promise.all([
        listLoanProducts(),
        listLoanApplications(),
        listLoanReminders(),
        listDismissedLoanReminders(),
      ]);
      setProducts(productsRes.items || []);
      setApplications(applicationsRes.items || []);
      setReminders(remindersRes.items || []);
      setDismissedReminders(dismissedRes.items || []);
      setUnreadCount(Number(remindersRes.unreadCount || 0));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load MyLoan overview");
      setProducts([]);
      setApplications([]);
      setReminders([]);
      setDismissedReminders([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("loan-reminders-unread-changed", { detail: { count: unreadCount } }));
  }, [unreadCount]);

  const stats = useMemo(() => {
    const submitted = applications.filter((item) => item.status === "SUBMITTED").length;
    const approved = applications.filter((item) => item.status === "APPROVED").length;
    const moreInfo = applications.filter((item) => item.status === "MORE_INFO_REQUIRED").length;
    const totalRequested = applications.reduce((sum, item) => sum + Number(item.amountRequested || 0), 0);
    const totalEquityFunded = applications.reduce((sum, item) => sum + Number(item.equity.confirmedAmount || 0), 0);
    const totalEquityPending = applications.reduce((sum, item) => sum + Number(item.equity.pendingAmount || 0), 0);
    return { submitted, approved, moreInfo, totalRequested, totalEquityFunded, totalEquityPending };
  }, [applications]);

  const repaymentAlerts = useMemo(() => {
    const liveFacilities = applications.filter((item) => item.disbursedAt || item.repaymentSchedule.length > 0);
    const now = Date.now();
    const upcomingWindow = now + 7 * 24 * 60 * 60 * 1000;

    let overdueCount = 0;
    let upcomingCount = 0;
    let pendingManualCount = 0;

    for (const item of liveFacilities) {
      overdueCount += Number(item.repaymentSummary.overdueCount || 0);
      pendingManualCount += item.repaymentPayments.filter((payment) => payment.status === "SUBMITTED").length;
      const nextDueDate = item.repaymentSummary.nextDueDate ? new Date(item.repaymentSummary.nextDueDate).getTime() : null;
      if (nextDueDate && nextDueDate >= now && nextDueDate <= upcomingWindow) {
        upcomingCount += 1;
      }
    }

    return { overdueCount, upcomingCount, pendingManualCount, liveFacilities };
  }, [applications]);

  const latestApplications = applications.slice(0, 3);
  const visibleReminders = reminders.slice(0, 6);
  const dismissedHistory = dismissedReminders.slice(0, 4);
  const equityInProgress = applications
    .filter((item) => item.equity.requiredAmount > 0)
    .sort((a, b) => {
      const remainingDiff = Number(b.equity.remainingAmount || 0) - Number(a.equity.remainingAmount || 0);
      if (remainingDiff !== 0) return remainingDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 3);

  async function toggleReminderRead(reminder: UserNotification) {
    setReminderActionId(reminder.id);
    try {
      if (reminder.isRead) {
        const res = await markLoanReminderUnread(reminder.id);
        setReminders((current) => current.map((item) => (item.id === reminder.id ? res.item : item)));
        setUnreadCount(res.unreadCount);
      } else {
        const res = await markLoanReminderRead(reminder.id);
        setReminders((current) => current.map((item) => (item.id === reminder.id ? res.item : item)));
        setUnreadCount(res.unreadCount);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update reminder");
    } finally {
      setReminderActionId(null);
    }
  }

  async function dismissReminder(reminder: UserNotification) {
    setReminderActionId(reminder.id);
    try {
      const res = await dismissLoanReminder(reminder.id);
      setReminders((current) => current.filter((item) => item.id !== reminder.id));
      setDismissedReminders((current) => [{ ...reminder, dismissedAt: new Date().toISOString(), isRead: true }, ...current]);
      setUnreadCount(res.unreadCount);
      toast.success("Reminder dismissed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to dismiss reminder");
    } finally {
      setReminderActionId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    try {
      const res = await markAllLoanRemindersRead();
      setReminders((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(res.unreadCount);
      toast.success("All reminders marked as read");
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark all reminders as read");
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function restoreDismissedReminder(reminder: UserNotification) {
    setReminderActionId(reminder.id);
    try {
      const res = await restoreLoanReminder(reminder.id);
      setDismissedReminders((current) => current.filter((item) => item.id !== reminder.id));
      setReminders((current) => [res.item, ...current]);
      setUnreadCount(res.unreadCount);
      toast.success("Reminder restored");
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore reminder");
    } finally {
      setReminderActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            MyLoan
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Borrow with structure and clear review steps</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Choose the loan product that fits your need, upload the documents that support your request, and track admin feedback from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/app/loans/applications">
              Start application
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/app/loans/offers">View decisions</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Loan products" value={products.length} hint="Available to request now" />
        <StatCard label="Submitted" value={stats.submitted} hint="Waiting for admin review" />
        <StatCard label="Equity funded" value={formatMoney(stats.totalEquityFunded)} hint="Confirmed into your loan wallet" />
        <StatCard label="Equity pending" value={formatMoney(stats.totalEquityPending)} hint="Waiting for manual confirmation" />
      </div>

      {repaymentAlerts.liveFacilities.length > 0 ? (
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Repayment alerts</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Stay ahead of upcoming dues, overdue installments, and manual repayments still waiting for review.</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/app/loans/repayments">Open repayments</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="text-xs uppercase tracking-wide text-rose-500">Overdue now</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{repaymentAlerts.overdueCount}</div>
              <div className="mt-1 text-xs text-slate-500">Installments past due and still unpaid.</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="text-xs uppercase tracking-wide text-amber-600">Due within 7 days</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{repaymentAlerts.upcomingCount}</div>
              <div className="mt-1 text-xs text-slate-500">Facilities with the next due date approaching.</div>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
              <div className="text-xs uppercase tracking-wide text-indigo-600">Pending admin confirmation</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{repaymentAlerts.pendingManualCount}</div>
              <div className="mt-1 text-xs text-slate-500">Manual repayment submissions still under review.</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {reminders.length > 0 ? (
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Reminder timeline</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Recent in-app reminders created for upcoming and overdue repayments.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={unreadCount > 0 ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-100 text-slate-600"}>
                {unreadCount} unread
              </Badge>
              <Button variant="outline" size="sm" disabled={markingAllRead || unreadCount === 0} onClick={handleMarkAllRead}>
                {markingAllRead ? "Updating..." : "Mark all read"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`rounded-2xl border p-4 ${reminder.isRead ? "border-slate-200 bg-slate-50" : "border-indigo-200 bg-indigo-50/60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-950">{reminder.title}</div>
                      {!reminder.isRead ? <Badge className="border-indigo-200 bg-white text-indigo-700">Unread</Badge> : null}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{reminder.message}</div>
                  </div>
                  <Badge className={reminder.type === "LOAN_REPAYMENT_OVERDUE" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                    {reminder.type === "LOAN_REPAYMENT_OVERDUE" ? "Overdue" : "Upcoming"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">{formatDate(reminder.createdAt)}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reminderActionId === reminder.id}
                      onClick={() => toggleReminderRead(reminder)}
                    >
                      {reminderActionId === reminder.id ? "Updating..." : reminder.isRead ? "Mark unread" : "Mark read"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-slate-900"
                      disabled={reminderActionId === reminder.id}
                      onClick={() => dismissReminder(reminder)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {dismissedReminders.length > 0 ? (
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader>
            <CardTitle>Dismissed reminder history</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Keep a short audit trail of reminders you dismissed, with the option to restore one back into your active list.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {dismissedHistory.map((reminder) => (
              <div key={reminder.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{reminder.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{reminder.message}</div>
                  </div>
                  <Badge className="border-slate-200 bg-white text-slate-600">Dismissed</Badge>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">Dismissed {formatDate(reminder.dismissedAt || reminder.createdAt)}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reminderActionId === reminder.id}
                    onClick={() => restoreDismissedReminder(reminder)}
                  >
                    {reminderActionId === reminder.id ? "Restoring..." : "Restore"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader>
            <CardTitle>Available loan products</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <div className="text-sm text-slate-500">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No loan products are available yet.
              </div>
            ) : (
              products.map((product, index) => {
                const Icon = index % 3 === 0 ? HandCoins : index % 3 === 1 ? BriefcaseBusiness : Landmark;
                return (
                  <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">{product.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{product.description}</div>
                      </div>
                      <div className="rounded-xl bg-white p-2 shadow-sm">
                        <Icon className="h-5 w-5 text-indigo-700" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div>Amount: {formatMoney(product.minAmount, product.currency)} - {formatMoney(product.maxAmount, product.currency)}</div>
                      <div>Term: {product.minTermMonths} - {product.maxTermMonths} months</div>
                      <div>Rate: {(Number(product.annualInterestRatePct || 0) * 100).toFixed(2)}% yearly</div>
                      <div>
                        Equity: {(Number(product.equityRequirementPct || 0) * 100).toFixed(0)}% minimum, from{" "}
                        {formatMoney(product.minimumEquityAmount, product.currency)}
                      </div>
                      <div>Documents: {(product.requiredDocuments || []).length ? product.requiredDocuments.join(", ").replaceAll("_", " ") : "No required docs set"}</div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Latest application activity</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Keep an eye on status changes and admin feedback.</p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading activity...</div>
            ) : latestApplications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No applications yet. Your most recent loan updates will appear here.
              </div>
            ) : (
              latestApplications.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{item.product.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {formatMoney(item.amountRequested, item.product.currency)} · {item.termMonths} months
                      </div>
                    </div>
                    <Badge className={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">Submitted {formatDate(item.submittedAt)}</div>
                  {item.reviewNote ? (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-sm text-slate-700">
                      {item.reviewNote}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      <div className="uppercase tracking-wide text-slate-400">Required equity</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(item.equity.requiredAmount, item.product.currency)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      <div className="uppercase tracking-wide text-slate-400">Funded</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(item.equity.confirmedAmount, item.product.currency)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      <div className="uppercase tracking-wide text-slate-400">Remaining</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(item.equity.remainingAmount, item.product.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <ShieldCheck className="h-4 w-4 text-indigo-700" />
                Document-backed review
              </div>
              <div className="mt-2 leading-6">
                Upload supporting evidence such as employment proof or recent account statements so admin can assess your request without extra delays.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Equity wallet</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Track the amount already funded against the equity each loan application requires before approval.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/app/loans/applications">Manage wallet</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {equityInProgress.length === 0 ? (
            <div className="md:col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Your funded equity and pending manual confirmations will appear here once you start a loan request.
            </div>
          ) : (
            equityInProgress.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{item.product.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatMoney(item.amountRequested, item.product.currency)} requested</div>
                  </div>
                  <Badge className={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Required</span>
                    <span className="font-medium text-slate-900">{formatMoney(item.equity.requiredAmount, item.product.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Confirmed</span>
                    <span className="font-medium text-slate-900">{formatMoney(item.equity.confirmedAmount, item.product.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Pending</span>
                    <span className="font-medium text-slate-900">{formatMoney(item.equity.pendingAmount, item.product.currency)}</span>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, Math.round(item.equity.progressPct * 100)))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
