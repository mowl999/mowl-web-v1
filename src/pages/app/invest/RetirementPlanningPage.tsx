import InvestSectionPage from "./InvestSectionPage";
import { formatMoney, useInvestDashboardData } from "./useInvestData";
import InvestmentPlanCreateCard from "./InvestmentPlanCreateCard";

export default function RetirementPlanningPage() {
  const { loading, error, currency, getCategory } = useInvestDashboardData();
  const c = getCategory("RETIREMENT");

  return (
    <InvestSectionPage
      title="Retirement Planning"
      subtitle="Build a sustainable retirement target with contribution discipline and periodic review."
      stats={[
        { label: "Retirement Plans", value: String(c.plans) },
        { label: "Monthly Commitment", value: formatMoney(c.totalMonthlyCommitment, currency) },
        { label: "Current Balance", value: formatMoney(c.currentBalance, currency) },
      ]}
      focusItems={[
        {
          title: "Income Replacement",
          detail: "Estimate retirement needs and align your contribution plan to that outcome.",
        },
        {
          title: "Inflation Coverage",
          detail: "Protect long-term purchasing power through regular plan reviews.",
        },
        {
          title: "Milestone Checks",
          detail: "Track progress at age-based milestones and adjust where needed.",
        },
      ]}
      actions={[
        {
          title: "Set retirement age and target",
          detail: "Define your expected timeline and projected monthly retirement income.",
          to: "/app/invest/retirement",
        },
        {
          title: "Increase monthly allocation",
          detail: "Close forecast gaps by raising contributions gradually.",
          to: "/app/invest/reports",
        },
      ]}
      loading={loading}
      error={error}
    >
      <InvestmentPlanCreateCard productKey="RETIREMENT" defaultName="Retirement Plan" />
    </InvestSectionPage>
  );
}
