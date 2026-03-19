import React, { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";

import AppShell from "@/layouts/AppShells";
import { RequireAuth } from "@/app/RequireAuth";
import { RequireEntitlement } from "@/app/RequireEntitlement";
import { RequireRole } from "@/app/RequireRole";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const WorkspaceSelectPage = lazy(() => import("@/pages/WorkspaceSelectPage"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const ProfilePage = lazy(() => import("@/pages/app/ProfilePage"));
const MyContributionsDashboard = lazy(() => import("@/pages/app/contributions/MyContributionsDashboard"));
const GroupsPage = lazy(() => import("@/pages/app/contributions/GroupsPage"));
const PlanDetailsPage = lazy(() => import("@/pages/app/contributions/PlanDetailsPage"));
const IncomeProfilePage = lazy(() => import("@/pages/app/contributions/IncomeProfilePage"));
const ContributionsPage = lazy(() => import("@/pages/app/contributions/ContributionsPage"));
const PayoutsPage = lazy(() => import("@/pages/app/contributions/PayoutsPage"));
const ReportsPage = lazy(() => import("@/pages/app/contributions/ReportsPage"));
const StatementsPage = lazy(() => import("@/pages/app/contributions/StatementsPage"));
const Placeholder = lazy(() => import("@/pages/Placeholder"));
const InvestmentOverviewPage = lazy(() => import("@/pages/app/invest/InvestmentOverviewPage"));
const LongTermPlanningPage = lazy(() => import("@/pages/app/invest/LongTermPlanningPage"));
const ShortTermPlanningPage = lazy(() => import("@/pages/app/invest/ShortTermPlanningPage"));
const RetirementPlanningPage = lazy(() => import("@/pages/app/invest/RetirementPlanningPage"));
const LegacyPlanningPage = lazy(() => import("@/pages/app/invest/LegacyPlanningPage"));
const ChildrenFuturePlanningPage = lazy(() => import("@/pages/app/invest/ChildrenFuturePlanningPage"));
const InvestmentReportsPage = lazy(() => import("@/pages/app/invest/InvestmentReportsPage"));
const InvestmentStatementsPage = lazy(() => import("@/pages/app/invest/InvestmentStatementsPage"));
const LoanStatementsPage = lazy(() => import("@/pages/app/loans/LoanStatementsPage"));
const FundTransfersStatementsPage = lazy(() => import("@/pages/app/fund-transfers/FundTransfersStatementsPage"));
const LoansOverviewPage = lazy(() => import("@/pages/app/loans/LoansOverviewPage"));
const LoanApplicationsPage = lazy(() => import("@/pages/app/loans/LoanApplicationsPage"));
const LoanOffersPage = lazy(() => import("@/pages/app/loans/LoanOffersPage"));
const LoanRepaymentsPage = lazy(() => import("@/pages/app/loans/LoanRepaymentsPage"));
const FundTransfersOverviewPage = lazy(() => import("@/pages/app/fund-transfers/FundTransfersOverviewPage"));
const SendMoneyPage = lazy(() => import("@/pages/app/fund-transfers/SendMoneyPage"));
const SettlementsPage = lazy(() => import("@/pages/app/fund-transfers/SettlementsPage"));
const AdminHome = lazy(() => import("@/pages/app/admin/AdminHome"));
const PaymentsReview = lazy(() => import("@/pages/app/admin/PaymentsReview"));
const SwapsReview = lazy(() => import("@/pages/app/admin/SwapsReview"));
const PausesReview = lazy(() => import("@/pages/app/admin/PausesReview"));
const ContributionRulesPage = lazy(() => import("@/pages/app/admin/settings/ContributionRulesPage"));
const InvestmentRulesPage = lazy(() => import("@/pages/app/admin/settings/InvestmentRulesPage"));
const LoanApplicationsQueuePage = lazy(() => import("@/pages/app/admin/loans/LoanApplicationsQueuePage"));
const LoanDashboardPage = lazy(() => import("@/pages/app/admin/loans/LoanDashboardPage"));
const LoanEquityReviewPage = lazy(() => import("@/pages/app/admin/loans/LoanEquityReviewPage"));
const LoanRepaymentReviewPage = lazy(() => import("@/pages/app/admin/loans/LoanRepaymentReviewPage"));
const LoanProductsAdminPage = lazy(() => import("@/pages/app/admin/loans/LoanProductsAdminPage"));
const Users = lazy(() => import("@/pages/Users"));

function RouteLoader() {
  return <div className="p-6 text-sm text-slate-500">Loading…</div>;
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/", element: withSuspense(<Landing />) },
  { path: "/login", element: withSuspense(<Login />) },
  { path: "/signup", element: withSuspense(<Signup />) },
  { path: "/forgot-password", element: withSuspense(<ForgotPassword />) },
  { path: "/reset-password", element: withSuspense(<ResetPassword />) },

      {
        element: <RequireAuth />,
        children: [
          { path: "/app", element: withSuspense(<WorkspaceSelectPage />) },
          { path: "/app/products", element: withSuspense(<WorkspaceSelectPage />) },

      // =========================
      // USER: THRIFT workspace
      // =========================
      {
        element: <RequireRole role="USER" />,
        children: [
          {
            element: <RequireEntitlement entitlement="THRIFT" />,
            children: [
              {
                path: "/app/thrift",
                element: (
                  <WorkspaceProvider>
                    <AppShell />
                  </WorkspaceProvider>
                ),
                children: [
                  { index: true, element: withSuspense(<MyContributionsDashboard />) },
                  { path: "affordability-summary", element: withSuspense(<IncomeProfilePage />) },
                  { path: "income-profile", element: withSuspense(<IncomeProfilePage />) },
                  { path: "goals", element: withSuspense(<GroupsPage />) },
                  { path: "goals/:planId", element: withSuspense(<PlanDetailsPage />) },
                  { path: "groups", element: withSuspense(<GroupsPage />) },
                  { path: "groups/:planId", element: withSuspense(<PlanDetailsPage />) },
                  { path: "contributions", element: withSuspense(<ContributionsPage />) },
                  { path: "payouts", element: withSuspense(<PayoutsPage />) },
                  { path: "statements", element: withSuspense(<StatementsPage />) },
                  { path: "reports", element: withSuspense(<ReportsPage />) },
                  { path: "profile", element: withSuspense(<ProfilePage />) },
                ],
              },
            ],
          },
        ],
      },

      // =========================
      // USER: INVEST workspace (placeholder)
      // =========================
      {
        element: <RequireRole role="USER" />,
        children: [
          {
            element: <RequireEntitlement entitlement="INVEST" />,
            children: [
              {
                path: "/app/invest",
                element: (
                  <WorkspaceProvider>
                    <AppShell />
                  </WorkspaceProvider>
                ),
                children: [
                  { index: true, element: withSuspense(<InvestmentOverviewPage />) },
                  { path: "long-term", element: withSuspense(<LongTermPlanningPage />) },
                  { path: "short-term", element: withSuspense(<ShortTermPlanningPage />) },
                  { path: "retirement", element: withSuspense(<RetirementPlanningPage />) },
                  { path: "legacy", element: withSuspense(<LegacyPlanningPage />) },
                  { path: "children-future", element: withSuspense(<ChildrenFuturePlanningPage />) },
                  { path: "statements", element: withSuspense(<InvestmentStatementsPage />) },
                  { path: "reports", element: withSuspense(<InvestmentReportsPage />) },
                  { path: "profile", element: withSuspense(<ProfilePage />) },
                ],
              },
            ],
          },
        ],
      },

      // =========================
      // USER: LOANS workspace
      // =========================
      {
        element: <RequireRole role="USER" />,
        children: [
          {
            element: <RequireEntitlement entitlement="LOANS" />,
            children: [
              {
                path: "/app/loans",
                element: (
                  <WorkspaceProvider>
                    <AppShell />
                  </WorkspaceProvider>
                ),
                children: [
                  { index: true, element: withSuspense(<LoansOverviewPage />) },
                  { path: "applications", element: withSuspense(<LoanApplicationsPage />) },
                  { path: "offers", element: withSuspense(<LoanOffersPage />) },
                  { path: "repayments", element: withSuspense(<LoanRepaymentsPage />) },
                  { path: "statements", element: withSuspense(<LoanStatementsPage />) },
                  { path: "reports", element: withSuspense(<Placeholder title="Loan Reports" />) },
                  { path: "profile", element: withSuspense(<ProfilePage />) },
                ],
              },
            ],
          },
        ],
      },

      // =========================
      // USER: FUND TRANSFERS workspace
      // =========================
      {
        element: <RequireRole role="USER" />,
        children: [
          {
            element: <RequireEntitlement entitlement="FUND_TRANSFERS" />,
            children: [
              {
                path: "/app/fund-transfers",
                element: (
                  <WorkspaceProvider>
                    <AppShell />
                  </WorkspaceProvider>
                ),
                children: [
                  { index: true, element: withSuspense(<FundTransfersOverviewPage />) },
                  { path: "send", element: withSuspense(<SendMoneyPage />) },
                  { path: "settlements", element: withSuspense(<SettlementsPage />) },
                  { path: "statements", element: withSuspense(<FundTransfersStatementsPage />) },
                  { path: "reports", element: withSuspense(<Placeholder title="Fund Transfers Reports" />) },
                  { path: "profile", element: withSuspense(<ProfilePage />) },
                ],
              },
            ],
          },
        ],
      },

      // =========================
      // ADMIN workspace
      // =========================
      {
        element: <RequireRole role="ADMIN" />,
        children: [
          {
            element: <RequireEntitlement entitlement="ADMIN" />,
            children: [
              {
                path: "/app/admin",
                element: (
                  <WorkspaceProvider>
                    <AppShell />
                  </WorkspaceProvider>
                ),
                children: [
                  { index: true, element: withSuspense(<AdminHome />) },
                  { path: "settings", element: <Navigate to="/app/admin/settings/contributions" replace /> },
                  { path: "settings/contributions", element: withSuspense(<ContributionRulesPage />) },
                  { path: "settings/investment", element: withSuspense(<InvestmentRulesPage />) },
                  { path: "settings/loans", element: withSuspense(<LoanProductsAdminPage mode="settings" />) },
                  { path: "users", element: withSuspense(<Users />) },
                  { path: "payments", element: withSuspense(<PaymentsReview />) },
                  { path: "loans", element: <Navigate to="/app/admin/loans/dashboard" replace /> },
                  { path: "loans/dashboard", element: withSuspense(<LoanDashboardPage />) },
                  { path: "loans/applications", element: withSuspense(<LoanApplicationsQueuePage />) },
                  { path: "loans/equity", element: withSuspense(<LoanEquityReviewPage />) },
                  { path: "loans/repayments", element: withSuspense(<LoanRepaymentReviewPage />) },
                  { path: "loans/products", element: withSuspense(<LoanProductsAdminPage mode="operations" />) },
                  { path: "pauses", element: withSuspense(<PausesReview />) },
                  { path: "swaps", element: withSuspense(<SwapsReview />) },
                  { path: "profile", element: withSuspense(<ProfilePage />) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
