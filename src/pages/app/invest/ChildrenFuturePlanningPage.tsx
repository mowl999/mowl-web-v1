import InvestSectionPage from "./InvestSectionPage";
import { formatMoney, useInvestDashboardData } from "./useInvestData";
import InvestmentPlanCreateCard from "./InvestmentPlanCreateCard";

export default function ChildrenFuturePlanningPage() {
  const { loading, error, currency, getCategory } = useInvestDashboardData();
  const c = getCategory("CHILDREN_FUTURE");

  return (
    <InvestSectionPage
      title="Children Education & Future Planning"
      subtitle="Plan education and life milestone funding for children with dedicated goal tracks."
      stats={[
        { label: "Children Plans", value: String(c.plans) },
        { label: "Monthly Commitment", value: formatMoney(c.totalMonthlyCommitment, currency) },
        { label: "Current Balance", value: formatMoney(c.currentBalance, currency) },
      ]}
      focusItems={[
        {
          title: "Education Funding",
          detail: "Prepare tuition and school-related targets based on expected milestone dates.",
        },
        {
          title: "Future Milestones",
          detail: "Set additional goals for relocation, skills development, or early career support.",
        },
        {
          title: "Consistent Contributions",
          detail: "Use automated monthly contributions to stay on track for each child plan.",
        },
      ]}
      actions={[
        {
          title: "Create child education plan",
          detail: "Define target amount, expected year, and monthly contribution.",
          to: "/app/invest/children-future",
        },
        {
          title: "Split goals by child",
          detail: "Track each education and future plan independently for better clarity.",
          to: "/app/invest/reports",
        },
      ]}
      loading={loading}
      error={error}
    >
      <InvestmentPlanCreateCard productKey="CHILDREN_FUTURE" defaultName="Children Future Plan" />
    </InvestSectionPage>
  );
}
