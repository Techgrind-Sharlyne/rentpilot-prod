// server/utils/kcb-parser.ts
/**
 * Raw KCB M-Pesa webhook payload.
 *
 * KCB's exact format may vary; this type is intentionally loose.
 * Adjust the field names below to match the real JSON body you receive.
 */
export type RawKcbMpesaPayload = any;

/**
 * Normalized representation of an incoming KCB M-Pesa payment.
 */
export type NormalizedKcbPayment = {
  txId: string | null;
  amount: number;
  msisdn: string | null;
  account: string | null; // e.g. "8027591#A3-04"
  accountHouseNo: string | null; // the part after "#", or full account if no "#"
  paidAt: Date | null;
  raw: RawKcbMpesaPayload;
};

/**
 * Extracts house/unit number from an account string like: "8027591#A3-04"
 */
export function extractHouseNoFromAccount(account: string | null): string | null {
  if (!account) return null;
  const parts = account.split("#");
  if (parts.length === 1) return parts[0] || null;
  return parts[1] || null;
}

/**
 * Normalize a KCB ↔ M-Pesa webhook payload into our internal representation.
 *
 * You MUST adjust the field mapping to match the actual KCB payload:
 * - Amount
 * - Transaction ID / reference
 * - Account / BillRef / etc.
 * - MSISDN
 * - Timestamp
 */
export function normalizeKcbMpesaPayload(body: RawKcbMpesaPayload): NormalizedKcbPayment {
  // --- CHANGE THESE LINES to match the real payload fields ---
  const amountRaw =
    body?.amount ??
    body?.Amount ??
    body?.TransAmount ??
    body?.transactionAmount ??
    0;

  const txIdRaw =
    body?.transactionId ??
    body?.TransID ??
    body?.transId ??
    body?.reference ??
    null;

  const accountRaw =
    body?.accountNumber ??
    body?.BillRefNumber ??
    body?.billRefNumber ??
    body?.BusinessShortCodeAndAccount ??
    null;

  const msisdnRaw =
    body?.msisdn ??
    body?.MSISDN ??
    body?.phoneNumber ??
    body?.customerMsisdn ??
    null;

  const timestampRaw =
    body?.transactionTime ??
    body?.TransTime ??
    body?.timestamp ??
    null;

  const accountHouseNo = extractHouseNoFromAccount(accountRaw);

  let amount = 0;
  if (typeof amountRaw === "number") amount = amountRaw;
  else if (typeof amountRaw === "string") amount = Number(amountRaw.replace(/[^\d.]/g, "")) || 0;

  let paidAt: Date | null = null;
  if (typeof timestampRaw === "string") {
    // Try to parse various possible formats
    const isoCandidate = timestampRaw.match(/^\d{4}-\d{2}-\d{2}T/)
      ? timestampRaw
      : timestampRaw.match(/^\d{14}$/)
      ? // e.g. 20251113123045 → 2025-11-13T12:30:45
        `${timestampRaw.slice(0, 4)}-${timestampRaw.slice(4, 6)}-${timestampRaw.slice(
          6,
          8
        )}T${timestampRaw.slice(8, 10)}:${timestampRaw.slice(10, 12)}:${timestampRaw.slice(
          12,
          14
        )}`
      : null;

    if (isoCandidate) {
      const d = new Date(isoCandidate);
      if (!Number.isNaN(d.getTime())) paidAt = d;
    }
  }

  return {
    txId: txIdRaw ? String(txIdRaw) : null,
    amount,
    msisdn: msisdnRaw ? String(msisdnRaw) : null,
    account: accountRaw ? String(accountRaw) : null,
    accountHouseNo,
    paidAt,
    raw: body,
  };
}
