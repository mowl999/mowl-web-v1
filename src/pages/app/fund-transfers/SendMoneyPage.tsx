import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createFundTransferTransaction,
  listFundTransferTransactions,
  type FundTransferTransaction,
  type FundTransferTransactionType,
  type TransferDirection,
} from "@/lib/fundTransfersApi";

const TYPE_DEFAULT_DIRECTION: Record<FundTransferTransactionType, TransferDirection> = {
  REMITTANCE_OUT: "DEBIT",
  REMITTANCE_IN: "CREDIT",
  SETTLEMENT: "DEBIT",
  FX_FEE: "DEBIT",
  TRANSFER_FEE: "DEBIT",
  REFUND: "CREDIT",
  ADJUSTMENT: "CREDIT",
};

const SEND_TYPES: FundTransferTransactionType[] = ["REMITTANCE_OUT", "REMITTANCE_IN", "TRANSFER_FEE", "REFUND"];

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n || 0));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function SendMoneyPage() {
  const [items, setItems] = useState<FundTransferTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<FundTransferTransactionType>("REMITTANCE_OUT");
  const [direction, setDirection] = useState<TransferDirection>(TYPE_DEFAULT_DIRECTION.REMITTANCE_OUT);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await listFundTransferTransactions();
      setItems((res.items || []).filter((i) => SEND_TYPES.includes(i.type)));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load send-money activity");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onTypeChange(nextType: FundTransferTransactionType) {
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
      await createFundTransferTransaction({
        type,
        direction,
        amount: Number(amount),
        currency: currency || "GBP",
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success("Transfer transaction saved");
      setAmount("");
      setReference("");
      setNote("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save transfer transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Send Money</h1>
        <p className="text-sm text-slate-500">Record outbound and inbound remittance activity.</p>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-base">Record Send-Money Transaction</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Type</label>
              <select className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={type} onChange={(e) => onTypeChange(e.target.value as FundTransferTransactionType)}>
                {SEND_TYPES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Direction</label>
              <select className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm" value={direction} onChange={(e) => setDirection(e.target.value as TransferDirection)}>
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
        <CardHeader><CardTitle className="text-base">Send-Money Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No send-money activity yet.</div>
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
