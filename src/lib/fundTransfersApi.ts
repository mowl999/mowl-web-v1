import { apiFetch } from "@/lib/api";

export type TransferDirection = "DEBIT" | "CREDIT";
export type FundTransferTransactionType =
  | "REMITTANCE_OUT"
  | "REMITTANCE_IN"
  | "SETTLEMENT"
  | "FX_FEE"
  | "TRANSFER_FEE"
  | "REFUND"
  | "ADJUSTMENT";

export type FundTransferTransaction = {
  id: string;
  userId: string;
  type: FundTransferTransactionType;
  direction: TransferDirection;
  amount: number;
  currency: string;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
};

export function listFundTransferTransactions() {
  return apiFetch<{ items: FundTransferTransaction[] }>("/v1/fund-transfers/transactions");
}

export function createFundTransferTransaction(payload: {
  type: FundTransferTransactionType;
  direction: TransferDirection;
  amount: number;
  currency?: string;
  reference?: string;
  note?: string;
}) {
  return apiFetch<{ item: FundTransferTransaction }>("/v1/fund-transfers/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
