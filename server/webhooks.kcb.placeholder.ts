import type { Request, Response } from "express";
import { pool } from "./db";

/** POST /webhooks/kcb-mpesa (placeholder) */
export async function kcbWebhookPlaceholder(req: Request, res: Response) {
  // Accept anything, store as pending from "kcb-webhook-placeholder"
  const payload = req.body || {};
  const txId = payload?.TransactionId || payload?.TransID || null;
  const msisdn = payload?.MSISDN || null;
  const amount = Number(payload?.TransAmount || 0) || 0;

  // Store raw as a pending payment so we can allocate later
  if (amount > 0) {
    await pool.query(
      `INSERT INTO payments(tenant_id, amount, status, method, source, tx_id, msisdn, paid_at)
       VALUES (NULL, $1, 'pending', 'mpesa', 'kcb-webhook-placeholder', $2, $3, now()) 
       ON CONFLICT (tx_id) DO NOTHING`,
      [amount, txId, msisdn]
    );
  }

  res.json({ ok: true, placeholder: true });
}
