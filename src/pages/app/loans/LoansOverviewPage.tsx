import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listLoanTransactions, type LoanTransaction } from "@/lib/loansApi";

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n || 0));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function LoansOverviewPage() {
  const [items, setItems] = useState<LoanTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await listLoanTransactions();
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan activity");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of items) {
      if (item.direction === "DEBIT") totalDebit += Number(item.amount || 0);
      if (item.direction === "CREDIT") totalCredit += Number(item.amount || 0);
    }
    const balance = totalCredit - totalDebit;
    return { totalDebit, totalCredit, balance, count: items.length };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">MyLoan Overview</h1>
          <p className="text-sm text-slate-500">Track disbursements, repayments, and loan-related adjustments.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Transactions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{summary.count}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Outflow</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(summary.totalDebit)}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Inflow</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(summary.totalCredit)}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Net Position</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(summary.balance)}</div></CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader><CardTitle className="text-base">Recent Loan Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No loan transactions yet. Use Repayments to post activity.</div>
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
                  {items.slice(0, 10).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">{row.type}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.reference || row.id}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {row.direction === "DEBIT" ? "-" : "+"}{formatMoney(row.amount, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
