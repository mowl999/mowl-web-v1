import { apiFetch, getToken } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type LoanApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "MORE_INFO_REQUIRED"
  | "APPROVED"
  | "REJECTED";

export type LoanApplicationUpdateType =
  | "APPLICATION_CREATED"
  | "APPLICATION_UPDATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_REMOVED"
  | "SUBMITTED"
  | "INFO_REQUESTED"
  | "CUSTOMER_RESPONSE"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "SCHEDULE_GENERATED";

export type LoanDocumentType =
  | "IDENTITY"
  | "EMPLOYMENT_EVIDENCE"
  | "BANK_STATEMENT"
  | "BUSINESS_PROOF"
  | "ADDRESS_PROOF"
  | "OTHER";

export type LoanProduct = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRatePct: number;
  processingFeePct: number;
  equityRequirementPct: number;
  minimumEquityAmount: number;
  currency: string;
  requiredDocuments?: LoanDocumentType[] | null;
  isActive: boolean;
};

export type LoanEquityContribution = {
  id: string;
  amount: number;
  currency: string;
  channel: "GATEWAY" | "BANK_TRANSFER";
  paymentRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

export type LoanEquityPayment = {
  id: string;
  amount: number;
  currency: string;
  channel: "GATEWAY" | "BANK_TRANSFER";
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  providerRef?: string | null;
  userReference?: string | null;
  receiptUrl?: string | null;
  note?: string | null;
  reviewNote?: string | null;
  reviewedById?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
};

export type LoanApplicationDocument = {
  id: string;
  documentType: LoanDocumentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type LoanApplicationUpdate = {
  id: string;
  actorType: "USER" | "ADMIN" | "SYSTEM" | string;
  entryType: LoanApplicationUpdateType;
  title: string;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type LoanRepaymentInstallment = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  feeAmount: number;
  totalDue: number;
  amountPaid: number;
  outstandingAmount: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "WAIVED" | string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoanRepaymentPayment = {
  id: string;
  installmentId: string;
  amount: number;
  currency: string;
  channel: "GATEWAY" | "BANK_TRANSFER";
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  providerRef?: string | null;
  userReference?: string | null;
  receiptUrl?: string | null;
  note?: string | null;
  reviewNote?: string | null;
  reviewedById?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
};

export type LoanApplication = {
  id: string;
  status: LoanApplicationStatus;
  amountRequested: number;
  termMonths: number;
  purpose: string;
  employmentStatus?: string | null;
  employerName?: string | null;
  businessName?: string | null;
  monthlyIncomeSnapshot?: number | null;
  monthlyExpenseSnapshot?: number | null;
  applicantNote?: string | null;
  reviewNote?: string | null;
  approvedAmount?: number | null;
  approvedTermMonths?: number | null;
  annualInterestRatePct?: number | null;
  processingFeePct?: number | null;
  disbursedAmount?: number | null;
  disbursementRef?: string | null;
  disbursedAt?: string | null;
  repaymentStartDate?: string | null;
  reviewedAt?: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  product: LoanProduct;
  documents: LoanApplicationDocument[];
  equity: {
    requiredAmount: number;
    confirmedAmount: number;
    pendingAmount: number;
    remainingAmount: number;
    progressPct: number;
    canApprove: boolean;
  };
  equityContributions: LoanEquityContribution[];
  equityPayments: LoanEquityPayment[];
  repaymentPayments: LoanRepaymentPayment[];
  updates: LoanApplicationUpdate[];
  repaymentSummary: {
    installmentsCount: number;
    totalScheduled: number;
    totalPaid: number;
    outstandingBalance: number;
    nextDueDate?: string | null;
    nextDueAmount?: number | null;
    overdueCount: number;
  };
  repaymentSchedule: LoanRepaymentInstallment[];
  transactions: LoanTransaction[];
  reviewedBy?: { id: string; fullName: string; email: string } | null;
  disbursedBy?: { id: string; fullName: string; email: string } | null;
  user?: { id: string; fullName: string; email: string; state?: string } | null;
};

export type LoanDraftPayload = {
  productId: string;
  amountRequested: number;
  termMonths: number;
  purpose: string;
  employmentStatus?: string;
  employerName?: string;
  businessName?: string;
  monthlyIncomeSnapshot?: number;
  monthlyExpenseSnapshot?: number;
  applicantNote?: string;
};

export type LoanDirection = "DEBIT" | "CREDIT";
export type LoanTransactionType =
  | "DISBURSEMENT"
  | "REPAYMENT"
  | "INTEREST_CHARGE"
  | "FEE"
  | "WAIVER"
  | "ADJUSTMENT";

export type LoanTransaction = {
  id: string;
  userId: string;
  applicationId?: string | null;
  installmentId?: string | null;
  type: LoanTransactionType;
  direction: LoanDirection;
  amount: number;
  currency: string;
  reference?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type UserNotification = {
  id: string;
  workspace: "LOANS" | string;
  type: "LOAN_REPAYMENT_DUE_SOON" | "LOAN_REPAYMENT_OVERDUE" | string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  dismissedAt?: string | null;
  createdAt: string;
};

export function listLoanProducts() {
  return apiFetch<{ items: LoanProduct[] }>("/v1/loans/products");
}

export function listLoanApplications() {
  return apiFetch<{ items: LoanApplication[] }>("/v1/loans/applications");
}

export function getLoanApplication(applicationId: string) {
  return apiFetch<{ item: LoanApplication }>(`/v1/loans/applications/${applicationId}`);
}

export function listLoanReminders() {
  return apiFetch<{ items: UserNotification[]; unreadCount: number }>("/v1/loans/reminders");
}

export function listDismissedLoanReminders() {
  return apiFetch<{ items: UserNotification[] }>("/v1/loans/reminders/history");
}

export function markLoanReminderRead(notificationId: string) {
  return apiFetch<{ item: UserNotification; unreadCount: number }>(`/v1/loans/reminders/${notificationId}/read`, {
    method: "POST",
  });
}

export function markLoanReminderUnread(notificationId: string) {
  return apiFetch<{ item: UserNotification; unreadCount: number }>(`/v1/loans/reminders/${notificationId}/unread`, {
    method: "POST",
  });
}

export function dismissLoanReminder(notificationId: string) {
  return apiFetch<{ ok: boolean; unreadCount: number }>(`/v1/loans/reminders/${notificationId}/dismiss`, {
    method: "POST",
  });
}

export function restoreLoanReminder(notificationId: string) {
  return apiFetch<{ item: UserNotification; unreadCount: number }>(`/v1/loans/reminders/${notificationId}/restore`, {
    method: "POST",
  });
}

export function markAllLoanRemindersRead() {
  return apiFetch<{ ok: boolean; unreadCount: number }>("/v1/loans/reminders/read-all", {
    method: "POST",
  });
}

export function createLoanApplicationDraft(payload: LoanDraftPayload) {
  return apiFetch<{ item: LoanApplication }>("/v1/loans/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateLoanApplication(applicationId: string, payload: LoanDraftPayload) {
  return apiFetch<{ item: LoanApplication }>(`/v1/loans/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function submitLoanApplication(applicationId: string) {
  return apiFetch<{ item: LoanApplication }>(`/v1/loans/applications/${applicationId}/submit`, {
    method: "POST",
  });
}

export function respondToLoanInfoRequest(applicationId: string, payload: { note: string }) {
  return apiFetch<{ item: LoanApplication }>(`/v1/loans/applications/${applicationId}/respond`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadLoanDocument(applicationId: string, payload: { documentType: LoanDocumentType; file: File }) {
  const body = new FormData();
  body.set("documentType", payload.documentType);
  body.set("file", payload.file);
  return apiFetch<{ item: LoanApplicationDocument }>(`/v1/loans/applications/${applicationId}/documents`, {
    method: "POST",
    body,
  });
}

export function deleteLoanDocument(applicationId: string, documentId: string) {
  return apiFetch<{ ok: boolean }>(`/v1/loans/applications/${applicationId}/documents/${documentId}`, {
    method: "DELETE",
  });
}

export async function downloadLoanDocument(applicationId: string, documentId: string, fileName: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/v1/loans/applications/${applicationId}/documents/${documentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to download document.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function getLoanEquityPaymentOptions(applicationId: string) {
  return apiFetch<{
    applicationId: string;
    currency: string;
    methods: Array<{
      code: "STRIPE_CARD" | "BANK_TRANSFER_MANUAL";
      label: string;
      description: string;
      submissionMode: "GATEWAY" | "BANK_TRANSFER";
    }>;
  }>(`/v1/loans/applications/${applicationId}/equity/payment-options`);
}

export function listLoanEquityPayments(applicationId: string) {
  return apiFetch<{
    applicationId: string;
    equity: LoanApplication["equity"];
    contributions: LoanEquityContribution[];
    payments: LoanEquityPayment[];
  }>(`/v1/loans/applications/${applicationId}/equity/payments`);
}

export function submitLoanEquityGatewayPayment(
  applicationId: string,
  payload: { amount: number; providerRef?: string; note?: string }
) {
  return apiFetch<{
    status: string;
    payment: LoanEquityPayment;
    contribution: LoanEquityContribution;
    application: LoanApplication;
  }>(`/v1/loans/applications/${applicationId}/equity/payments/gateway`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitLoanEquityManualPayment(
  applicationId: string,
  payload: { amount: number; userReference: string; note?: string; receiptUrl?: string }
) {
  return apiFetch<{
    status: string;
    message: string;
    payment: LoanEquityPayment;
  }>(`/v1/loans/applications/${applicationId}/equity/payments/manual`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getLoanRepaymentPaymentOptions(installmentId: string) {
  return apiFetch<{
    installmentId: string;
    applicationId: string;
    currency: string;
    methods: Array<{
      code: "STRIPE_CARD" | "BANK_TRANSFER_MANUAL";
      label: string;
      description: string;
      submissionMode: "GATEWAY" | "BANK_TRANSFER";
    }>;
  }>(`/v1/loans/installments/${installmentId}/payment-options`);
}

export function submitLoanRepaymentGatewayPayment(
  installmentId: string,
  payload: { amount: number; providerRef?: string; note?: string }
) {
  return apiFetch<{
    status: string;
    payment: LoanRepaymentPayment;
    application: LoanApplication;
  }>(`/v1/loans/installments/${installmentId}/payments/gateway`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitLoanRepaymentManualPayment(
  installmentId: string,
  payload: { amount: number; userReference: string; note?: string; receiptUrl?: string }
) {
  return apiFetch<{
    status: string;
    message: string;
    payment: LoanRepaymentPayment;
  }>(`/v1/loans/installments/${installmentId}/payments/manual`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listLoanTransactions() {
  return apiFetch<{ items: LoanTransaction[] }>("/v1/loans/transactions");
}

export function createLoanTransaction(payload: {
  applicationId?: string;
  installmentId?: string;
  type: LoanTransactionType;
  direction: LoanDirection;
  amount: number;
  currency?: string;
  reference?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  return apiFetch<{ item: LoanTransaction }>("/v1/loans/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
