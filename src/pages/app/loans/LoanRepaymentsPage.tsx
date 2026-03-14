import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createLoanTransaction,
  listLoanTransactions,
  type LoanDirection,
  type LoanTransaction,
  type LoanTransactionType,
} from "@/lib/loansApi";

const TYPE_DEFAULT_DIRECTION: Record<LoanTransactionType, LoanDirection> = {
  DISBURSEMENT: "CREDIT",
  REPAYMENT: "DEBIT",
  INTEREST_CHARGE: "DEBIT",
  FEE: "DEBIT",
  WAIVER: "CREDIT",
  ADJUSTMENT: "CREDIT",
};

const TYPE_OPTIONS: LoanTransactionType[] = [
  "DISBURSEMENT",
  "REPAYMENT",
  "INTEREST_CHARGE",
  "FEE",
  "WAIVER",
  "ADJUSTMENT",
];

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n || 0));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function LoanRepaymentsPage() {
  const [items, setItems] = useState<LoanTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<LoanTransactionType>("REPAYMENT");
  const [direction, setDirection] = useState<LoanDirection>(TYPE_DEFAULT_DIRECTION.REPAYMENT);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await listLoanTransactions();
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load transactions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onTypeChange(nextType: LoanTransactionType) {
    setType(nextType);
    setDirection(TYPE_DEFAULT_DIRECTION[nextType]);
  }

  const canSave = useMemo(() => Number(amount) > 0, [amount]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      await createLoanTransaction({
        type,
        direction,
        amount: Number(amount),
        currency: currency || "GBP",
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success("Loan transaction saved");
      setAmount("");
      setReference("");
      setNote("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Repayments & Activity</h1>
        <p className="text-sm text-slate-500">Post loan repayments and related loan entries. Statements update immediately.</p>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-base">Record Loan Transaction</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Type</label>
              <select className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={type} onChange={(e) => onTypeChange(e.target.value as LoanTransactionType)}>
                {TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Direction</label>
              <select className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={direction} onChange={(e) => setDirection(e.target.value as LoanDirection)}>
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Amount</label>
              <input className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Currency</label>
              <input className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="GBP" maxLength={3} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Reference</label>
              <input className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-xs text-slate-500">Note</label>
              <input className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={saving || !canSave}>{saving ? "Saving..." : "Save Transaction"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No activity yet.</div>
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
                  {items.map((row) => (
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
