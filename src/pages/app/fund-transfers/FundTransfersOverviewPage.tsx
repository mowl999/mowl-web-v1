import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listFundTransferTransactions, type FundTransferTransaction } from "@/lib/fundTransfersApi";

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n || 0));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function FundTransfersOverviewPage() {
  const [items, setItems] = useState<FundTransferTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await listFundTransferTransactions();
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load fund transfer activity");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    let totalOut = 0;
    let totalIn = 0;
    for (const item of items) {
      if (item.direction === "DEBIT") totalOut += Number(item.amount || 0);
      if (item.direction === "CREDIT") totalIn += Number(item.amount || 0);
    }
    return {
      count: items.length,
      totalOut,
      totalIn,
      net: totalIn - totalOut,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">MyFundTransfers Overview</h1>
          <p className="text-sm text-slate-500">Track send-money, settlement, and transfer fee activity.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Transactions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{summary.count}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Sent</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(summary.totalOut)}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Received</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(summary.totalIn)}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Net Flow</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(summary.net)}</div></CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No transfer activity yet. Use Send Money or Settlements to add activity.</div>
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
                      <td className="px-4 py-3 text-right font-medium">{row.direction === "DEBIT" ? "-" : "+"}{formatMoney(row.amount, row.currency)}</td>
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
