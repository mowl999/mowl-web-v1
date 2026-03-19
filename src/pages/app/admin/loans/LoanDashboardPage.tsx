import { useCallback, useEffect, useState } from "react";
import { BellRing, Clock3, HandCoins, Landmark, MailCheck, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { getAdminLoanDashboard, runAdminLoanReminderJob, type LoanAdminDashboard } from "@/lib/adminLoansApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryTile, formatMoney } from "./shared";

export default function LoanDashboardPage() {
  const [data, setData] = useState<LoanAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningReminders, setRunningReminders] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminLoanDashboard();
      setData(res);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load MyLoan dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runReminders() {
    setRunningReminders(true);
    try {
      const res = await runAdminLoanReminderJob();
      toast.success(
        `Reminder job complete. ${res.summary.dueSoonCreated} due-soon, ${res.summary.overdueCreated} overdue, ${res.summary.emailsSent} emails sent.`
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to run reminder job");
    } finally {
      setRunningReminders(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Admin Console / MyLoan</div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Loan dashboard</h1>
          <p className="text-sm text-slate-500">Monitor loan operations, repayment pressure, and reminder activity from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={runReminders} disabled={runningReminders}>
            <BellRing className="h-4 w-4" />
            {runningReminders ? "Running reminders..." : "Run reminder job"}
          </Button>
        </div>
      </div>

      {!data ? (
        <Card className="rounded-2xl border shadow-sm dashboard-card">
          <CardContent className="p-6 text-sm text-slate-500">{loading ? "Loading loan dashboard..." : "No loan dashboard data available."}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile label="Applications" value={data.overview.applicationsCount} hint="All submitted and draft loan requests" icon={Landmark} />
            <SummaryTile label="Disbursed loans" value={data.overview.disbursedCount} hint="Facilities already funded" icon={HandCoins} />
            <SummaryTile label="Pending equity review" value={data.queues.pendingEquityReviews} hint="Manual equity transfers waiting on admin" icon={Clock3} />
            <SummaryTile label="Pending repayment review" value={data.queues.pendingRepaymentReviews} hint="Manual repayment transfers waiting on admin" icon={MailCheck} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-2xl border shadow-sm dashboard-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-950">Repayment health</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Open installments</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{data.repayments.openInstallments}</div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Due within 7d</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{data.repayments.dueSoonCount}</div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Overdue</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{data.repayments.overdueCount}</div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Outstanding total</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(data.repayments.outstandingTotal)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm dashboard-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-950">Reminder activity</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Sent last 7d</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{data.reminders.last7dTotal}</div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Due soon</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{data.reminders.dueSoonSent}</div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Overdue</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{data.reminders.overdueSent}</div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Emails sent</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{data.reminders.emailsSent}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border shadow-sm dashboard-card">
            <CardHeader>
              <CardTitle className="text-base text-slate-950">Repayment aging buckets</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="text-xs uppercase tracking-wide text-amber-600">1-7 days late</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{data.repayments.agingBuckets.d1To7}</div>
                <div className="mt-1 text-xs text-slate-500">Newly overdue installments that need immediate follow-up.</div>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="text-xs uppercase tracking-wide text-orange-600">8-30 days late</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{data.repayments.agingBuckets.d8To30}</div>
                <div className="mt-1 text-xs text-slate-500">Installments with growing delinquency risk.</div>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <div className="text-xs uppercase tracking-wide text-rose-600">30+ days late</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{data.repayments.agingBuckets.d30Plus}</div>
                <div className="mt-1 text-xs text-slate-500">High-risk delinquent installments that likely need escalation.</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm dashboard-card">
            <CardHeader>
              <CardTitle className="text-base text-slate-950">Commercial summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Products</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{data.overview.productsCount}</div>
                <div className="mt-1 text-xs text-slate-500">{data.overview.activeProductsCount} active for new borrowers</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Submitted queue</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{data.overview.submittedCount}</div>
                <div className="mt-1 text-xs text-slate-500">Applications waiting for admin decision</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">More info</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{data.overview.moreInfoCount}</div>
                <div className="mt-1 text-xs text-slate-500">Applications returned to customers for updates</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Repaid total</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(data.repayments.repaidTotal)}</div>
                <div className="mt-1 text-xs text-slate-500">Total confirmed loan repayments posted</div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
