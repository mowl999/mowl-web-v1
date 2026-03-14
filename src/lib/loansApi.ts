import { apiFetch } from "@/lib/api";

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
  type: LoanTransactionType;
  direction: LoanDirection;
  amount: number;
  currency: string;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
};

export function listLoanTransactions() {
  return apiFetch<{ items: LoanTransaction[] }>("/v1/loans/transactions");
}

export function createLoanTransaction(payload: {
  type: LoanTransactionType;
  direction: LoanDirection;
  amount: number;
  currency?: string;
  reference?: string;
  note?: string;
}) {
  return apiFetch<{ item: LoanTransaction }>("/v1/loans/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

