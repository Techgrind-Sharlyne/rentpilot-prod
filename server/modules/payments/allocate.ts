// server/modules/payments/allocate.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Allocate a payment (by txId) across open invoices oldest-first for a tenant+unit.
 * - Keeps invoices 'sent/overdue' until fully covered; sets 'paid' when remaining==0
 * - Writes to payment_applications
 * - Back-compat: sets payments.invoice_id to the FIRST invoice touched (if null)
 */
export async function applyPaymentAllocations(opts: {
  txId: string;
  tenantId: string;
  unitId: string;
  amount?: number; // optional; will be read from payments if not provided
}) {
  const { txId, tenantId, unitId } = opts;

  await db.transaction(async (tx) => {
    // 1) Load payment row
    const pRes = await tx.execute(sql`
      SELECT id, amount, invoice_id
      FROM payments
      WHERE tx_id = ${txId}
      LIMIT 1
    `);
    const payment = pRes.rows?.[0] as { id: string; amount: number; invoice_id: string | null } | undefined;
    if (!payment) throw new Error(`Payment not found for txId=${txId}`);

    let toAllocate = Number(payment.amount);

    // 2) Fetch open invoices + current remaining per invoice (oldest-first)
    const invRes = await tx.execute(sql`
      SELECT
        i.id,
        i.amount
          - COALESCE((
              SELECT SUM(pa.amount)
              FROM payment_applications pa
              WHERE pa.invoice_id = i.id
            ), 0) AS remaining
      FROM invoices i
      WHERE i.tenant_id = ${tenantId}
        AND i.unit_id   = ${unitId}
        AND i.status IN ('sent','overdue')
      ORDER BY i.due_date ASC NULLS LAST, i.created_at ASC
      FOR UPDATE
    `);

    let firstInvoiceTouched: string | null = null;

    // 3) Allocate loop
    for (const row of invRes.rows ?? []) {
      if (toAllocate <= 0) break;
      const invId = (row as any).id as string;
      const remaining = Number((row as any).remaining ?? 0);
      if (remaining <= 0) continue;

      const applyAmt = Math.min(toAllocate, remaining);
      // upsert application (unique on payment_id+invoice_id makes it idempotent)
      await tx.execute(sql`
        INSERT INTO payment_applications (payment_id, invoice_id, amount)
        VALUES (${payment.id}, ${invId}, ${applyAmt})
        ON CONFLICT (payment_id, invoice_id) DO UPDATE
          SET amount = payment_applications.amount + EXCLUDED.amount
      `);

      // mark first invoice touched for back-compat
      if (!firstInvoiceTouched) firstInvoiceTouched = invId;

      // if invoice now fully covered, mark paid
      if (applyAmt === remaining) {
        await tx.execute(sql`UPDATE invoices SET status='paid', updated_at=now() WHERE id=${invId}`);
      }

      toAllocate -= applyAmt;
    }

    // 4) Back-compat: set payments.invoice_id to first invoice touched if null
    if (firstInvoiceTouched) {
      await tx.execute(sql`
        UPDATE payments
        SET invoice_id = COALESCE(invoice_id, ${firstInvoiceTouched})
        WHERE id = ${payment.id}
      `);
    }
  });
}
