// server/routes.webhooks.kcb-mpesa.ts
import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { payments } from "./schema"; // ⚠️ Adjust import names to your schema file
import {
  normalizeKcbMpesaPayload,
  type NormalizedKcbPayment,
} from "./utils/kcb-parser";

const router = Router();

/**
 * Optional: environment-based secret the bank must send with the webhook
 * e.g. in header: x-kcb-webhook-secret: <KCB_WEBHOOK_SECRET>
 */
const WEBHOOK_SECRET = process.env.KCB_WEBHOOK_SECRET || "";

/**
 * Basic auth / secret validation.
 * If you don't have a secret yet, you can temporarily disable this check.
 */
function verifyWebhookSecret(req: Request): boolean {
  if (!WEBHOOK_SECRET) return true; // no secret configured → allow (dev)
  const header = (req.headers["x-kcb-webhook-secret"] ||
    req.headers["x-webhook-secret"]) as string | undefined;
  return header === WEBHOOK_SECRET;
}

/**
 * Check if a payment with the same txId already exists.
 * This assumes you have a "tx_id" (or similar) column on your payments table.
 *
 * ⚠️ Adjust `payments.tx_id` to match your Drizzle schema column name.
 */
async function isDuplicateTxId(txId: string | null): Promise<boolean> {
  if (!txId) return false;
  const existing = await db
    .select({ id: payments.id })
    .from(payments)
    // @ts-expect-error: adjust tx_id column if needed
    .where(eq(payments.tx_id, txId))
    .limit(1);
  return existing.length > 0;
}

/**
 * You MUST implement this function based on your actual schema:
 *
 *  - Given an account house number (e.g. "A3-04"), find:
 *    - unitId
 *    - tenantId (active lease)
 *
 * For now it's a stub returning null.
 */
async function mapHouseNoToTenantUnit(
  houseNo: string | null
): Promise<{ tenantId: string; unitId?: string } | null> {
  if (!houseNo) return null;

  // 🔧 TODO: Implement using your own tables, e.g.:
  //
  // import { units, tenants, leases } from "./schema";
  //
  // const [unit] = await db
  //   .select()
  //   .from(units)
  //   .where(eq(units.unitNumber, houseNo))
  //   .limit(1);
  //
  // const [activeLease] = await db
  //   .select()
  //   .from(leases)
  //   .where(
  //     and(
  //       eq(leases.unitId, unit.id),
  //       eq(leases.status, "active")
  //     )
  //   )
  //   .limit(1);
  //
  // return { tenantId: activeLease.tenantId, unitId: unit.id };

  return null;
}

/**
 * Record a normalized KCB payment by delegating to your existing /api/payments logic.
 *
 * This is deliberately done via HTTP call to the same API endpoint so we reuse
 * whatever ledger + summary logic you already have inside your payments route.
 *
 * If you prefer, you can instead import a shared `createPayment(...)` function
 * from your server/payments.ts module and call it directly.
 */
async function recordPaymentViaApiGateway(
  normalized: NormalizedKcbPayment,
  mapping: { tenantId: string; unitId?: string } | null
): Promise<void> {
  const tenantId = mapping?.tenantId;
  const unitId = mapping?.unitId;

  if (!tenantId) {
    // If you reach here, mapping failed – you can choose to:
    // - throw,
    // - or just log and store raw payload elsewhere.
    console.warn(
      "[KCB-MPESA] No tenant mapping for accountHouseNo:",
      normalized.accountHouseNo
    );
    return;
  }

  const port = process.env.PORT || "8081"; // staging: 8081, prod: 8080
  const baseUrl = process.env.APP_BASE_URL || `http://127.0.0.1:${port}`;

  const payload = {
    tenantId,
    unitId,
    amount: normalized.amount,
    method: "mpesa",
    source: "import" as const,
    txId: normalized.txId || undefined,
    msisdn: normalized.msisdn || undefined,
    paidAt: normalized.paidAt ? normalized.paidAt.toISOString() : undefined,
    description: `KCB Paybill ${normalized.account || ""}`.trim(),
    notes: "Recorded via KCB M-Pesa webhook",
    status: "paid" as const,
  };

  await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Optional: internal header to distinguish webhook-initiated payments
      "x-internal-source": "kcb-mpesa-webhook",
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      console.error(
        "[KCB-MPESA] Failed to POST /api/payments",
        res.status,
        text
      );
      throw new Error(`Failed to record payment via API (${res.status})`);
    }
  });
}

/**
 * Optional: log raw webhook payloads for troubleshooting.
 * You can wire this into a dedicated "webhook_logs" table instead of console.
 */
async function logWebhookPayload(normalized: NormalizedKcbPayment) {
  // 🔧 TODO: Persist to a "webhook_logs" table if desired.
  console.log("[KCB-MPESA] Webhook payload normalized:", {
    txId: normalized.txId,
    amount: normalized.amount,
    account: normalized.account,
    accountHouseNo: normalized.accountHouseNo,
    msisdn: normalized.msisdn,
    paidAt: normalized.paidAt?.toISOString?.() ?? null,
  });
}

/**
 * Main KCB M-Pesa webhook route:
 *
 *  POST /api/webhooks/kcb-mpesa
 */
router.post(
  "/api/webhooks/kcb-mpesa",
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      if (!verifyWebhookSecret(req)) {
        return res.status(401).json({ ok: false, error: "Invalid webhook secret" });
      }

      const normalized = normalizeKcbMpesaPayload(req.body);

      await logWebhookPayload(normalized);

      if (normalized.amount <= 0) {
        return res
          .status(400)
          .json({ ok: false, error: "Invalid amount in payload" });
      }

      if (normalized.txId && (await isDuplicateTxId(normalized.txId))) {
        // Idempotency: ignore duplicate callbacks with same transaction id
        return res.status(200).json({ ok: true, duplicate: true });
      }

      const mapping = await mapHouseNoToTenantUnit(normalized.accountHouseNo);

      // Record payment via existing /api/payments pipeline
      await recordPaymentViaApiGateway(normalized, mapping);

      // Up to you: respond 202 if mapping failed but we still logged payload
      return res.status(200).json({
        ok: true,
        mapped: Boolean(mapping),
        tenantId: mapping?.tenantId ?? null,
        unitId: mapping?.unitId ?? null,
      });
    } catch (err: any) {
      console.error("[KCB-MPESA] Webhook error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Internal error handling webhook" });
    }
  }
);

export default router;
