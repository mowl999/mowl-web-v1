type StatementRow = {
  date: string;
  description: string;
  reference: string;
  direction: string;
  amount: number;
  currency: string;
  runningBalance: number;
};

type StatementSummary = {
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
};

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
}

function dateFmt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function openStatementPdfPrint(params: {
  title: string;
  startDate: string;
  endDate: string;
  summary: StatementSummary;
  rows: StatementRow[];
}) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) throw new Error("Unable to open print window. Please allow popups.");

  const currency = params.rows?.[0]?.currency || "GBP";
  const rowsHtml = params.rows
    .map((r) => {
      const debit = r.direction === "DEBIT" ? money(r.amount, r.currency) : "—";
      const credit = r.direction === "CREDIT" ? money(r.amount, r.currency) : "—";
      return `
        <tr>
          <td>${esc(dateFmt(r.date))}</td>
          <td>${esc(r.description)}</td>
          <td>${esc(r.reference)}</td>
          <td style="text-align:right;">${esc(debit)}</td>
          <td style="text-align:right;">${esc(credit)}</td>
          <td style="text-align:right;font-weight:600;">${esc(money(r.runningBalance, r.currency))}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${esc(params.title)} Statement</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
        h1 { margin: 0 0 8px 0; font-size: 20px; }
        .muted { color: #475569; font-size: 12px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0 18px 0; }
        .card { border: 1px solid #dbeafe; border-radius: 8px; padding: 10px; }
        .k { font-size: 11px; color: #475569; margin-bottom: 6px; }
        .v { font-size: 16px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f8fafc; color: #334155; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${esc(params.title)} Statement</h1>
      <div class="muted">Period: ${esc(params.startDate)} to ${esc(params.endDate)} | Generated: ${esc(new Date().toISOString())}</div>
      <div class="grid">
        <div class="card"><div class="k">Opening Balance</div><div class="v">${esc(money(params.summary.openingBalance, currency))}</div></div>
        <div class="card"><div class="k">Total Debit</div><div class="v">${esc(money(params.summary.totalDebits, currency))}</div></div>
        <div class="card"><div class="k">Total Credit</div><div class="v">${esc(money(params.summary.totalCredits, currency))}</div></div>
        <div class="card"><div class="k">Closing Balance</div><div class="v">${esc(money(params.summary.closingBalance, currency))}</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Reference</th>
            <th style="text-align:right;">Debit</th>
            <th style="text-align:right;">Credit</th>
            <th style="text-align:right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="6">No activity in selected period.</td></tr>`}
        </tbody>
      </table>
      <script>
        window.onload = function () { window.print(); };
      </script>
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

