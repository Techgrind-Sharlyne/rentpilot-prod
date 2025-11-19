// client/src/api/payments.ts
import { apiRequest } from "@/lib/queryClient";

/**
 * Shape of a payment row as returned by the API.
 * This mirrors the type used in rent-income.tsx
 * to stay backward compatible.
 */
export type PaymentRow = {
  id?: string | null;
  tenant_id?: string | null;
  unit_id?: string | null;
  invoice_id?: string | null;
  amount?: number | string | null;
  status?: "paid" | "pending" | "overdue" | "failed" | string | null;
  method?: string | null;
  source?: string | null;
  tx_id?: string | null;
  msisdn?: string | null;
  paid_at?: string | null;
  receipt_url?: string | null;
  created_at?: string | null;
};

/**
 * Payload for creating / recording a payment.
 * This matches what FinanceModal & RentIncome are already sending.
 */
export type CreatePaymentPayload = {
  tenantId: string;
  unitId?: string;
  amount: number;
  method?: "mpesa" | "bank" | "manual";
  source?: "counter" | "portal" | "import";
  txId?: string;
  msisdn?: string;
  paidAt?: string; // ISO 8601
  description?: string;
  notes?: string;
  status?: "paid" | "pending" | "failed";
};

/**
 * Fetch all payments.
 * Used by the Rent Income Payments view.
 */
export async function fetchPayments(): Promise<PaymentRow[]> {
  return apiRequest("GET", "/api/payments");
}

/**
 * Fetch a single payment by its ID.
 * Intended for future "Edit Payment" flows in FinanceModal.
 */
export async function fetchPaymentById(
  paymentId: string
): Promise<PaymentRow | null> {
  if (!paymentId) return null;
  return apiRequest("GET", `/api/payments/${encodeURIComponent(paymentId)}`);
}

/**
 * Create / record a new payment.
 * This wraps POST /api/payments with a strongly typed payload.
 */
export async function createPayment(
  payload: CreatePaymentPayload
): Promise<PaymentRow> {
  return apiRequest("POST", "/api/payments", payload);
}

/**
 * Optional helper if you ever want to look up payments via txId
 * (for idempotency / debugging of KCB Paybill callbacks).
 * This assumes you wire a matching backend route later.
 */
export async function fetchPaymentByTxId(
  txId: string
): Promise<PaymentRow | null> {
  if (!txId) return null;
  return apiRequest("GET", `/api/payments/tx/${encodeURIComponent(txId)}`);
}
