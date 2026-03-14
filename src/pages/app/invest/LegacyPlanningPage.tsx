import InvestSectionPage from "./InvestSectionPage";
import { formatMoney, useInvestDashboardData } from "./useInvestData";
import InvestmentPlanCreateCard from "./InvestmentPlanCreateCard";

export default function LegacyPlanningPage() {
  const { loading, error, currency, getCategory } = useInvestDashboardData();
  const c = getCategory("LEGACY");

  return (
    <InvestSectionPage
      title="Will & Legacy Planning"
      subtitle="Structure wealth transfer goals and align long-term investments with family legacy priorities."
      stats={[
        { label: "Legacy Plans", value: String(c.plans) },
        { label: "Monthly Commitment", value: formatMoney(c.totalMonthlyCommitment, currency) },
        { label: "Current Balance", value: formatMoney(c.currentBalance, currency) },
      ]}
      focusItems={[
        {
          title: "Family Protection",
          detail: "Create dedicated plans for dependants and long-term household stability.",
        },
        {
          title: "Wealth Transfer",
          detail: "Align investment buckets to planned transfer objectives and timelines.",
        },
        {
          title: "Governance Readiness",
          detail: "Keep your will and supporting instructions synchronized with financial plans.",
        },
      ]}
      actions={[
        {
          title: "Create legacy allocation track",
          detail: "Set percentage allocation for heirs, dependants, and philanthropic goals.",
          to: "/app/invest/legacy",
        },
        {
          title: "Run annual legacy review",
          detail: "Recheck targets after major life or income changes.",
          to: "/app/invest/reports",
        },
      ]}
      loading={loading}
      error={error}
    >
      <InvestmentPlanCreateCard productKey="LEGACY" defaultName="Will & Legacy Plan" />
    </InvestSectionPage>
  );
}
