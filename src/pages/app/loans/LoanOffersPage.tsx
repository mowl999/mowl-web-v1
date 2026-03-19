import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Info, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listLoanApplications, type LoanApplication } from "@/lib/loansApi";

function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusTone(status: LoanApplication["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  if (status === "MORE_INFO_REQUIRED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "SUBMITTED") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function LoanOffersPage() {
  const [items, setItems] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await listLoanApplications();
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan decisions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const decisionItems = useMemo(
    () => items.filter((item) => ["APPROVED", "REJECTED", "MORE_INFO_REQUIRED", "SUBMITTED"].includes(item.status)),
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Loan decisions</h1>
          <p className="text-sm text-slate-500">Track admin feedback, approvals, and any additional information requested on your loan requests.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm text-slate-500">Approved</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{items.filter((item) => item.status === "APPROVED").length}</div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm text-slate-500">More info requested</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{items.filter((item) => item.status === "MORE_INFO_REQUIRED").length}</div>
            </div>
            <Info className="h-6 w-6 text-amber-600" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm text-slate-500">Rejected</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{items.filter((item) => item.status === "REJECTED").length}</div>
            </div>
            <XCircle className="h-6 w-6 text-red-600" />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader>
          <CardTitle>Decision timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : decisionItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No loan decisions yet. Submitted requests will appear here once admin begins review.
            </div>
          ) : (
            decisionItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-950">{item.product.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {formatMoney(item.amountRequested, item.product.currency)} · {item.termMonths} months
                    </div>
                  </div>
                  <Badge className={statusTone(item.status)}>{item.status.replaceAll("_", " ")}</Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Submitted</div>
                    <div className="mt-1 font-medium text-slate-900">{formatDate(item.submittedAt)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Reviewed</div>
                    <div className="mt-1 font-medium text-slate-900">{formatDate(item.reviewedAt)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Documents</div>
                    <div className="mt-1 font-medium text-slate-900">{item.documents.length}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-700">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <Clock3 className="h-4 w-4 text-indigo-700" />
                    Review note
                  </div>
                  <div className="mt-2">{item.reviewNote || "No note has been shared yet. Keep monitoring this request for the latest admin update."}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
