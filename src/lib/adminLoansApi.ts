import { apiFetch } from "@/lib/api";
import type { LoanApplication, LoanEquityPayment, LoanProduct, LoanRepaymentPayment } from "@/lib/loansApi";

export function listAdminLoanApplications(
  status: "DRAFT" | "SUBMITTED" | "MORE_INFO_REQUIRED" | "APPROVED" | "REJECTED" | "ALL" = "SUBMITTED"
) {
  return apiFetch<{ items: LoanApplication[] }>(`/v1/admin/loans/applications?status=${status}`);
}

export type LoanAdminDashboard = {
  overview: {
    productsCount: number;
    activeProductsCount: number;
    applicationsCount: number;
    submittedCount: number;
    moreInfoCount: number;
    approvedCount: number;
    disbursedCount: number;
  };
  queues: {
    pendingEquityReviews: number;
    pendingRepaymentReviews: number;
  };
  repayments: {
    openInstallments: number;
    dueSoonCount: number;
    overdueCount: number;
    repaidTotal: number;
    outstandingTotal: number;
    agingBuckets: {
      d1To7: number;
      d8To30: number;
      d30Plus: number;
    };
  };
  reminders: {
    last7dTotal: number;
    dueSoonSent: number;
    overdueSent: number;
    emailsSent: number;
  };
  settings?: LoanReminderSettings;
};

export type LoanReminderSettings = {
  id: string;
  upcomingReminderDays: number;
  overdueReminderRepeatDays: number;
  emailRemindersEnabled: boolean;
  inAppRemindersEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function getAdminLoanDashboard() {
  return apiFetch<LoanAdminDashboard>("/v1/admin/loans/dashboard");
}

export function runAdminLoanReminderJob() {
  return apiFetch<{ summary: { scanned: number; dueSoonCreated: number; overdueCreated: number; emailsSent: number }; ranAt: string }>(
    "/v1/admin/loans/reminders/run",
    {
      method: "POST",
    }
  );
}

export function getAdminLoanSettings() {
  return apiFetch<{ settings: LoanReminderSettings }>("/v1/admin/loans/settings");
}

export function updateAdminLoanSettings(payload: Omit<LoanReminderSettings, "id" | "createdAt" | "updatedAt">) {
  return apiFetch<{ settings: LoanReminderSettings }>("/v1/admin/loans/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function reviewAdminLoanApplication(
  applicationId: string,
  payload: {
    decision: "APPROVE" | "REJECT" | "REQUEST_INFO";
    reviewNote: string;
    approvedAmount?: number;
    approvedTermMonths?: number;
  }
) {
  return apiFetch<{ item: LoanApplication }>(`/v1/admin/loans/applications/${applicationId}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function disburseAdminLoanApplication(
  applicationId: string,
  payload: { disbursedAmount?: number; repaymentStartDate: string; disbursementRef?: string; note?: string }
) {
  return apiFetch<{ item: LoanApplication }>(`/v1/admin/loans/applications/${applicationId}/disburse`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listAdminLoanProducts() {
  return apiFetch<{ items: LoanProduct[] }>("/v1/admin/loans/products");
}

export function createAdminLoanProduct(
  payload: Pick<
    LoanProduct,
    | "name"
    | "description"
    | "minAmount"
    | "maxAmount"
    | "minTermMonths"
    | "maxTermMonths"
    | "annualInterestRatePct"
    | "processingFeePct"
    | "equityRequirementPct"
    | "minimumEquityAmount"
    | "requiredDocuments"
    | "isActive"
  >
) {
  return apiFetch<{ product: LoanProduct }>("/v1/admin/loans/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminLoanProduct(
  productId: string,
  payload: Partial<
    Pick<
      LoanProduct,
      | "name"
      | "description"
      | "minAmount"
      | "maxAmount"
      | "minTermMonths"
      | "maxTermMonths"
      | "annualInterestRatePct"
      | "processingFeePct"
      | "equityRequirementPct"
      | "minimumEquityAmount"
      | "requiredDocuments"
      | "isActive"
    >
  >
) {
  return apiFetch<{ product: LoanProduct }>(`/v1/admin/loans/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type AdminLoanEquityPayment = LoanEquityPayment & {
  user: { id: string; fullName: string | null; email: string };
  application: {
    id: string;
    amountRequested: number;
    status: LoanApplication["status"];
    product: Pick<LoanProduct, "id" | "name" | "currency" | "equityRequirementPct" | "minimumEquityAmount">;
    equity: {
      requiredAmount: number;
      confirmedAmount: number;
      remainingAmount: number;
    };
  };
};

export function listAdminLoanEquityPayments(
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL" = "SUBMITTED"
) {
  return apiFetch<{ items: AdminLoanEquityPayment[] }>(`/v1/admin/loans/equity-payments?status=${status}`);
}

export function reviewAdminLoanEquityPayment(
  paymentId: string,
  payload: { decision: "APPROVE" | "REJECT"; reviewNote?: string; paymentRef?: string }
) {
  return apiFetch<{ payment: LoanEquityPayment }>(`/v1/admin/loans/equity-payments/${paymentId}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type AdminLoanRepaymentPayment = LoanRepaymentPayment & {
  user: { id: string; fullName: string | null; email: string };
  application: {
    id: string;
    status: LoanApplication["status"];
    approvedAmount?: number | null;
    amountRequested: number;
    product: Pick<LoanProduct, "id" | "name" | "currency">;
  };
  installment: {
    id: string;
    installmentNumber: number;
    dueDate: string;
    totalDue: number;
    amountPaid: number;
    outstandingAmount: number;
    status: string;
  };
};

export function listAdminLoanRepaymentPayments(
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL" = "SUBMITTED"
) {
  return apiFetch<{ items: AdminLoanRepaymentPayment[] }>(`/v1/admin/loans/repayment-payments?status=${status}`);
}

export function reviewAdminLoanRepaymentPayment(
  paymentId: string,
  payload: { decision: "APPROVE" | "REJECT"; reviewNote?: string; paymentRef?: string }
) {
  return apiFetch<{ payment: LoanRepaymentPayment; application?: LoanApplication }>(
    `/v1/admin/loans/repayment-payments/${paymentId}/review`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}
