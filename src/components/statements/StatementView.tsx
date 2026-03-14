import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openStatementPdfPrint } from "@/lib/statementPdf";

export type StatementRow = {
  date: string;
  product: string;
  activityType: string;
  reference: string;
  planId: string;
  planName: string;
  direction: "DEBIT" | "CREDIT" | string;
  amount: number;
  currency: string;
  description: string;
  runningBalance: number;
};

export type StatementData = {
  product: string;
  period: { startDate: string; endDate: string };
  generatedAt: string;
  summary: {
    totalCredits: number;
    totalDebits: number;
    net: number;
    openingBalance: number;
    closingBalance: number;
  };
  rows: StatementRow[];
};

type Preset = "7d" | "30d" | "custom";

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatMoney(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default function StatementView({
  title,
  description,
  pdfTitle,
  csvFilePrefix,
  filtersOnNewLine = false,
  fetchStatement,
  downloadCsvBlob,
}: {
  title: string;
  description: string;
  pdfTitle: string;
  csvFilePrefix: string;
  filtersOnNewLine?: boolean;
  fetchStatement: (startDate: string, endDate: string) => Promise<StatementData>;
  downloadCsvBlob: (startDate: string, endDate: string) => Promise<Blob>;
}) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [startDate, setStartDate] = useState(dateDaysAgo(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (preset === "7d") {
      setStartDate(dateDaysAgo(7));
      setEndDate(new Date().toISOString().slice(0, 10));
    }
    if (preset === "30d") {
      setStartDate(dateDaysAgo(30));
      setEndDate(new Date().toISOString().slice(0, 10));
    }
  }, [preset]);

  async function load() {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      setStatement(await fetchStatement(startDate, endDate));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load statement");
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const currency = useMemo(() => statement?.rows?.[0]?.currency || "GBP", [statement?.rows]);

  async function downloadCsv() {
    if (!startDate || !endDate) return;
    setDownloading(true);
    try {
      const blob = await downloadCsvBlob(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${csvFilePrefix}-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Failed to download statement");
    } finally {
      setDownloading(false);
    }
  }

  function downloadPdf() {
    if (!statement) return;
    try {
      openStatementPdfPrint({
        title: pdfTitle,
        startDate,
        endDate,
        summary: statement.summary,
        rows: statement.rows.map((r) => ({
          date: r.date,
          description: r.description,
          reference: r.reference,
          direction: r.direction,
          amount: r.amount,
          currency: r.currency,
          runningBalance: r.runningBalance,
        })),
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to open PDF print window");
    }
  }

  const filterControls = (
    <>
      <select
        className="h-10 min-w-[128px] rounded-md border border-indigo-200 bg-white px-3 text-sm"
        value={preset}
        onChange={(e) => setPreset(e.target.value as Preset)}
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="custom">Custom</option>
      </select>
      <input
        type="date"
        className="h-10 min-w-[148px] rounded-md border border-indigo-200 bg-white px-3 text-sm"
        value={startDate}
        onChange={(e) => {
          setPreset("custom");
          setStartDate(e.target.value);
        }}
      />
      <input
        type="date"
        className="h-10 min-w-[148px] rounded-md border border-indigo-200 bg-white px-3 text-sm"
        value={endDate}
        onChange={(e) => {
          setPreset("custom");
          setEndDate(e.target.value);
        }}
      />
      <Button className="h-10 px-4" variant="outline" onClick={load} disabled={loading}>
        Refresh
      </Button>
      <Button className="h-10 px-4" onClick={downloadCsv} disabled={downloading || loading || !statement}>
        {downloading ? "Downloading..." : "Download CSV"}
      </Button>
      <Button className="h-10 px-4" variant="outline" onClick={downloadPdf} disabled={loading || !statement}>
        Download PDF
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {!filtersOnNewLine && (
          <div className="flex flex-wrap items-end gap-1.5">{filterControls}</div>
        )}
      </div>

      {filtersOnNewLine && (
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardContent className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-1.5">{filterControls}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Opening Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(statement?.summary.openingBalance || 0, currency)}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Debit</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(statement?.summary.totalDebits || 0, currency)}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Credit</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(statement?.summary.totalCredits || 0, currency)}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Closing Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatMoney(statement?.summary.closingBalance || 0, currency)}</div></CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-base">Statement Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading statement...</div>
          ) : !statement || statement.rows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No activity in selected period.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-left font-medium">Reference</th>
                    <th className="px-4 py-3 text-right font-medium">Debit</th>
                    <th className="px-4 py-3 text-right font-medium">Credit</th>
                    <th className="px-4 py-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.map((r) => (
                    <tr key={`${r.reference}-${r.date}`} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">{r.description}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.reference}</td>
                      <td className="px-4 py-3 text-right">{r.direction === "DEBIT" ? formatMoney(r.amount, r.currency) : "-"}</td>
                      <td className="px-4 py-3 text-right">{r.direction === "CREDIT" ? formatMoney(r.amount, r.currency) : "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(r.runningBalance, r.currency)}</td>
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
