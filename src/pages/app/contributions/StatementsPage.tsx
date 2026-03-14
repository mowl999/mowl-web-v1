import StatementView, { type StatementData } from "@/components/statements/StatementView";
import {
  downloadMyContributionsStatementCsv,
  getMyContributionsStatement,
} from "@/lib/reportsApi";

export default function StatementsPage() {
  return (
    <StatementView
      title="Statements"
      description="Standard transaction statement for MyContributions activity."
      pdfTitle="MyContributions"
      csvFilePrefix="mycontributions-statement"
      filtersOnNewLine
      fetchStatement={async (startDate, endDate) =>
        (await getMyContributionsStatement(startDate, endDate)) as StatementData
      }
      downloadCsvBlob={downloadMyContributionsStatementCsv}
    />
  );
}
