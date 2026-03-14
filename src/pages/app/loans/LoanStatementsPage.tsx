import StatementView, { type StatementData } from "@/components/statements/StatementView";
import {
  downloadMyLoanStatementCsv,
  getMyLoanStatement,
} from "@/lib/statementsApi";

export default function LoanStatementsPage() {
  return (
    <StatementView
      title="Statements"
      description="Standard transaction statement for MyLoan activity."
      pdfTitle="MyLoan"
      csvFilePrefix="myloan-statement"
      fetchStatement={async (startDate, endDate) =>
        (await getMyLoanStatement(startDate, endDate)) as StatementData
      }
      downloadCsvBlob={downloadMyLoanStatementCsv}
    />
  );
}
