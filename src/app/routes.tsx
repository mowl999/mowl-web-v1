import React from "react";
import { Navigate } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import WorkspaceSelectPage from "@/pages/WorkspaceSelectPage";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import AppShell from "@/layouts/AppShells";
import { RequireAuth } from "@/app/RequireAuth";
import { RequireEntitlement } from "@/app/RequireEntitlement";
import { RequireRole } from "@/app/RequireRole";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

import MyContributionsDashboard from "@/pages/app/contributions/MyContributionsDashboard";
import GroupsPage from "@/pages/app/contributions/GroupsPage";
import PlanDetailsPage from "@/pages/app/contributions/PlanDetailsPage";
import IncomeProfilePage from "@/pages/app/contributions/IncomeProfilePage";
import ContributionsPage from "@/pages/app/contributions/ContributionsPage";
import PayoutsPage from "@/pages/app/contributions/PayoutsPage";
import ReportsPage from "@/pages/app/contributions/ReportsPage";
import StatementsPage from "@/pages/app/contributions/StatementsPage";
import Placeholder from "@/pages/Placeholder";
import InvestmentOverviewPage from "@/pages/app/invest/InvestmentOverviewPage";
import LongTermPlanningPage from "@/pages/app/invest/LongTermPlanningPage";
import ShortTermPlanningPage from "@/pages/app/invest/ShortTermPlanningPage";
import RetirementPlanningPage from "@/pages/app/invest/RetirementPlanningPage";
import LegacyPlanningPage from "@/pages/app/invest/LegacyPlanningPage";
import ChildrenFuturePlanningPage from "@/pages/app/invest/ChildrenFuturePlanningPage";
import InvestmentReportsPage from "@/pages/app/invest/InvestmentReportsPage";
import InvestmentStatementsPage from "@/pages/app/invest/InvestmentStatementsPage";
import LoanStatementsPage from "@/pages/app/loans/LoanStatementsPage";
import FundTransfersStatementsPage from "@/pages/app/fund-transfers/FundTransfersStatementsPage";
import LoansOverviewPage from "@/pages/app/loans/LoansOverviewPage";
import LoanRepaymentsPage from "@/pages/app/loans/LoanRepaymentsPage";
import FundTransfersOverviewPage from "@/pages/app/fund-transfers/FundTransfersOverviewPage";
import SendMoneyPage from "@/pages/app/fund-transfers/SendMoneyPage";
import SettlementsPage from "@/pages/app/fund-transfers/SettlementsPage";

import AdminHome from "@/pages/app/admin/AdminHome";
import PaymentsReview from "@/pages/app/admin/PaymentsReview";
import SwapsReview from "@/pages/app/admin/SwapsReview";
import AdminRulesSettings from "@/pages/app/admin/AdminRulesSettings";
import PausesReview from "@/pages/app/admin/PausesReview";
import Users from "@/pages/Users";

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },

      {
        element: <RequireAuth />,
        children: [
          { path: "/app", element: <WorkspaceSelectPage /> },
          { path: "/app/products", element: <WorkspaceSelectPage /> },

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
                  { index: true, element: <MyContributionsDashboard /> },
                  { path: "affordability-summary", element: <IncomeProfilePage /> },
                  { path: "income-profile", element: <IncomeProfilePage /> },
                  { path: "goals", element: <GroupsPage /> },
                  { path: "goals/:planId", element: <PlanDetailsPage /> },
                  { path: "groups", element: <GroupsPage /> },
                  { path: "groups/:planId", element: <PlanDetailsPage /> },
                  { path: "contributions", element: <ContributionsPage /> },
                  { path: "payouts", element: <PayoutsPage /> },
                  { path: "statements", element: <StatementsPage /> },
                  { path: "reports", element: <ReportsPage /> },
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
                  { index: true, element: <InvestmentOverviewPage /> },
                  { path: "long-term", element: <LongTermPlanningPage /> },
                  { path: "short-term", element: <ShortTermPlanningPage /> },
                  { path: "retirement", element: <RetirementPlanningPage /> },
                  { path: "legacy", element: <LegacyPlanningPage /> },
                  { path: "children-future", element: <ChildrenFuturePlanningPage /> },
                  { path: "statements", element: <InvestmentStatementsPage /> },
                  { path: "reports", element: <InvestmentReportsPage /> },
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
                  { index: true, element: <LoansOverviewPage /> },
                  { path: "applications", element: <LoanRepaymentsPage /> },
                  { path: "offers", element: <LoansOverviewPage /> },
                  { path: "repayments", element: <LoanRepaymentsPage /> },
                  { path: "statements", element: <LoanStatementsPage /> },
                  { path: "reports", element: <Placeholder title="Loan Reports" /> },
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
                  { index: true, element: <FundTransfersOverviewPage /> },
                  { path: "send", element: <SendMoneyPage /> },
                  { path: "settlements", element: <SettlementsPage /> },
                  { path: "statements", element: <FundTransfersStatementsPage /> },
                  { path: "reports", element: <Placeholder title="Fund Transfers Reports" /> },
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
                  { index: true, element: <AdminHome /> },
                  { path: "settings", element: <AdminRulesSettings /> },
                  { path: "users", element: <Users /> },
                  { path: "payments", element: <PaymentsReview /> },
                  { path: "pauses", element: <PausesReview /> },
                  { path: "swaps", element: <SwapsReview /> },
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
