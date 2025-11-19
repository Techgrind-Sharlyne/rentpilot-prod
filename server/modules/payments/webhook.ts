// server/modules/payments/webhook.ts
import type { Request, Response } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { applyPaymentAllocations } from "./allocate";
import { generatePaymentReceipt } from "./receipt";

type NormalizedMpesa = {
  txId: string;
  amount: number;
  msisdn?: string;
  accountRef?: string; // e.g., unit_number like "A-103"
  paidAt?: string;     // ISO string
  source?: "stk" | "c2b";
};

// Accept both STK and C2B payload shapes
export function normalizeMpesaPayload(body: any): NormalizedMpesa | null {
  // STK callback (Body.stkCallback)
  const stk = body?.Body?.stkCallback;
  if (stk?.CallbackMetadata?.Item) {
    const items = Object.fromEntries(
      stk.CallbackMetadata.Item.map((i: any) => [i.Name, i.Value])
    );
    return {
      txId: String(stk.CheckoutRequestID ?? items?.MpesaReceiptNumber ?? ""),
      amount: Number(items?.Amount ?? 0),
      msisdn: items?.PhoneNumber ? String(items.PhoneNumber) : undefined,
      accountRef: String(items?.AccountReference ?? items?.BillRefNumber ?? ""),
      paidAt: new Date().toISOString(),
      source: "stk",
    };
  }

  // C2B (Confirmation/Validation)
  if (body?.TransID || body?.TransAmount || body?.BillRefNumber) {
    return {
      txId: String(body.TransID ?? body.TransRef ?? ""),
      amount: Number(body.TransAmount ?? body.amount ?? 0),
      msisdn: body.MSISDN ? String(body.MSISDN) : (body.SenderMSISDN ? String(body.SenderMSISDN) : undefined),
      accountRef: String(body.BillRefNumber ?? body.AccountReference ?? body.account ?? ""),
      paidAt: String(body.TransTime ?? new Date().toISOString()),
      source: "c2b",
    };
  }

  // Manual/developer payload
  if (body?.tx_id && body?.amount) {
    return {
      txId: String(body.tx_id),
      amount: Number(body.amount),
      msisdn: body.msisdn ? String(body.msisdn) : undefined,
      accountRef: body.account ? String(body.account) : (body.accountReference ? String(body.accountReference) : undefined),
      paidAt: body.paid_at ? String(body.paid_at) : new Date().toISOString(),
      source: "c2b",
    };
  }

  return null;
}

/**
 * Core: records payment, allocates, emits side effects.
 * Returns a summary object but DOES NOT write to the HTTP response.
 */
export async function recordMpesaPayment(req: Request) {
  const norm = normalizeMpesaPayload(req.body);
  if (!norm || !norm.txId || !Number.isFinite(norm.amount)) {
    return { ok: false, error: "Invalid payload" as const };
  }

  const txId = norm.txId.trim();
  const amount = Number(norm.amount);
  const msisdn = norm.msisdn?.trim();
  const accountRef = norm.accountRef?.trim();
  const paidAt = norm.paidAt ?? new Date().toISOString();
  const source = norm.source ?? "c2b";

  let duplicate = false;
  let unitId: string | null = null;
  let tenantId: string | null = null;

  // 1) Record payment (idempotent), and look up unit+tenant if accountRef provided
  await db.transaction(async (trx) => {
    // Insert payment
    try {
      await trx.execute(sql`
        INSERT INTO payments (tx_id, amount, msisdn, status, method, source, paid_at, payment_method)
        VALUES (${txId}, ${amount}, ${msisdn ?? null}, 'paid', 'mpesa', ${source}, ${paidAt}, 'mpesa')
      `);
    } catch (e: any) {
      if (e?.code === "23505") {
        duplicate = true;
        return;
      }
      throw e;
    }

    // No reference -> leave as unmatched payment (invoice_id stays null)
    if (!accountRef) return;

    // Resolve unit by accountRef (unit_number)
    const unitRes = await trx.execute(sql`
      SELECT id FROM units WHERE unit_number = ${accountRef} LIMIT 1
    `);
    unitId = unitRes.rows?.[0]?.id ?? null;
    if (!unitId) return;

    // Active tenant (latest active lease)
    const tenantRes = await trx.execute(sql`
      SELECT l.tenant_id
      FROM leases l
      WHERE l.unit_id = ${unitId} AND l.status = 'active'
      ORDER BY l.start_date DESC NULLS LAST
      LIMIT 1
    `);
    tenantId = tenantRes.rows?.[0]?.tenant_id ?? null;
  });

  // 2) If new (not duplicate) and we have tenant+unit, allocate across open invoices
  if (!duplicate && tenantId && unitId) {
    await applyPaymentAllocations({ txId, tenantId, unitId });
  }

  // 3) Best-effort: generate receipt + SMS
  let receiptUrl: string | undefined;
  try {
    const r = await generatePaymentReceipt({ txId });
    receiptUrl = r.url;
    const smsService = req.app.get("smsService");
    if (smsService && msisdn) {
      await smsService.sendSms(
        msisdn,
        `Payment received: KES ${amount.toLocaleString()} for ${accountRef ?? "your account"}.\nTx: ${txId}\nReceipt: ${receiptUrl}`
      );
    }
  } catch (e) {
    console.warn("receipt/sms post-hook failed:", (e as any)?.message ?? e);
  }

  // Optional SSE broadcast (best-effort)
  try {
    req.app.get("sse")?.broadcast?.({
      type: "payment:received",
      txId,
      amount,
      msisdn,
      accountRef,
      paidAt,
      duplicate,
      receiptUrl,
    });
  } catch {}

  return {
    ok: true as const,
    txId,
    amount,
    accountRef,
    matched: Boolean(tenantId && unitId),
    duplicate,
    receiptUrl,
  };
}

/**
 * Adapter 1: Daraja-friendly response shape for Validation/Confirmation/STK
 * Always 200 with {ResultCode, ResultDesc} so Daraja doesn’t retry storm.
 */
export async function mpesaPaybillCallbackDaraja(req: Request, res: Response) {
  try {
    // QUICK PATH: If this looks like a Validation call, just accept.
    if (
      typeof req.body?.TransactionType !== "undefined" &&
      typeof req.body?.TransAmount !== "undefined" &&
      typeof req.body?.BillRefNumber !== "undefined"
    ) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const result = await recordMpesaPayment(req);
    if (result.ok) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Payment processed successfully" });
    }
    return res.status(200).json({ ResultCode: 1, ResultDesc: result.error ?? "Rejected" });
  } catch (err) {
    console.error("mpesaPaybillCallbackDaraja error", err);
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Received" }); // don’t trigger retries
  }
}

/**
 * Adapter 2: JSON response for internal tools/tests
 */
export async function mpesaPaybillCallback(req: Request, res: Response) {
  try {
    const result = await recordMpesaPayment(req);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (err: any) {
    console.error("mpesaPaybillCallback error", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

// Back-compat export
export const mpesaWebhook = mpesaPaybillCallback;
