import InvestSectionPage from "./InvestSectionPage";
import { formatMoney, useInvestDashboardData } from "./useInvestData";
import InvestmentPlanCreateCard from "./InvestmentPlanCreateCard";

export default function ShortTermPlanningPage() {
  const { loading, error, currency, getCategory } = useInvestDashboardData();
  const c = getCategory("SHORT_TERM");

  return (
    <InvestSectionPage
      title="Short-Term Planning"
      subtitle="Organize short-term targets with clear timelines and predictable funding."
      stats={[
        { label: "Short-Term Plans", value: String(c.plans) },
        { label: "Monthly Commitment", value: formatMoney(c.totalMonthlyCommitment, currency) },
        { label: "Current Balance", value: formatMoney(c.currentBalance, currency) },
      ]}
      focusItems={[
        {
          title: "Goal Segmentation",
          detail: "Use separate plans for travel, emergency top-up, or major purchases.",
        },
        {
          title: "Liquidity Discipline",
          detail: "Balance access to funds with steady returns and lower downside exposure.",
        },
        {
          title: "Cash-Flow Fit",
          detail: "Keep monthly commitments within affordability limits from your profile.",
        },
      ]}
      actions={[
        {
          title: "Create a 12-month target",
          detail: "Set a monthly contribution and track milestone completion monthly.",
          to: "/app/invest/reports",
        },
        {
          title: "Review maturity timeline",
          detail: "Check which goals mature soon and schedule payouts ahead.",
          to: "/app/invest/long-term",
        },
      ]}
      loading={loading}
      error={error}
    >
      <InvestmentPlanCreateCard productKey="SHORT_TERM" defaultName="Short-Term Savings Plan" />
    </InvestSectionPage>
  );
}
