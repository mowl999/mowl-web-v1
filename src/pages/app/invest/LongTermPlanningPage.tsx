import InvestSectionPage from "./InvestSectionPage";
import { formatMoney, useInvestDashboardData } from "./useInvestData";
import InvestmentPlanCreateCard from "./InvestmentPlanCreateCard";

export default function LongTermPlanningPage() {
  const { loading, error, currency, getCategory } = useInvestDashboardData();
  const c = getCategory("LONG_TERM");

  return (
    <InvestSectionPage
      title="Long-Term Planning"
      subtitle="Build durable wealth with goal-based horizons for 5 to 20+ years."
      stats={[
        { label: "Long-Term Plans", value: String(c.plans) },
        { label: "Monthly Commitment", value: formatMoney(c.totalMonthlyCommitment, currency) },
        { label: "Current Balance", value: formatMoney(c.currentBalance, currency) },
      ]}
      focusItems={[
        {
          title: "Compounding Strategy",
          detail: "Stay consistent and let time and contribution discipline drive growth.",
        },
        {
          title: "Goal Buckets",
          detail: "Separate wealth goals like home upgrade, business capital, and financial independence.",
        },
        {
          title: "Risk Alignment",
          detail: "Match plan risk level to your timeline and income stability.",
        },
      ]}
      actions={[
        {
          title: "Create a 10-year growth track",
          detail: "Set target value, monthly amount, and confidence checkpoints.",
          to: "/app/invest/reports",
        },
        {
          title: "Run scenario comparison",
          detail: "Compare conservative vs balanced outcomes before committing.",
          to: "/app/invest/short-term",
        },
      ]}
      loading={loading}
      error={error}
    >
      <InvestmentPlanCreateCard productKey="LONG_TERM" defaultName="Long-Term Growth Plan" />
    </InvestSectionPage>
  );
}
