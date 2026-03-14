import StatementView, { type StatementData } from "@/components/statements/StatementView";
import {
  downloadMyFundTransfersStatementCsv,
  getMyFundTransfersStatement,
} from "@/lib/statementsApi";

export default function FundTransfersStatementsPage() {
  return (
    <StatementView
      title="Statements"
      description="Standard transaction statement for MyFundTransfers activity."
      pdfTitle="MyFundTransfers"
      csvFilePrefix="myfundtransfers-statement"
      fetchStatement={async (startDate, endDate) =>
        (await getMyFundTransfersStatement(startDate, endDate)) as StatementData
      }
      downloadCsvBlob={downloadMyFundTransfersStatementCsv}
    />
  );
}
