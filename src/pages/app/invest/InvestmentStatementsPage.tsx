import StatementView, { type StatementData } from "@/components/statements/StatementView";
import {
  downloadMyInvestmentStatementCsv,
  getMyInvestmentStatement,
} from "@/lib/investApi";

export default function InvestmentStatementsPage() {
  return (
    <StatementView
      title="Statements"
      description="Standard transaction statement for MyInvestment activity."
      pdfTitle="MyInvestment"
      csvFilePrefix="myinvestment-statement"
      fetchStatement={async (startDate, endDate) =>
        (await getMyInvestmentStatement(startDate, endDate)) as StatementData
      }
      downloadCsvBlob={downloadMyInvestmentStatementCsv}
    />
  );
}
