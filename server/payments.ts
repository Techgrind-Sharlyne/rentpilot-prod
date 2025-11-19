// server/routes/payments.ts
import { Router } from "express";
import { db } from "../db"; // your pg pool/knex/drizzle adapter
const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const {
      tenantId,
      unitId,
      amount,
      method,
      source,
      txId,
      msisdn,
      paidAt,
      description,
      notes,
    } = req.body || {};

    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "amount must be > 0" });

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1) Insert the payment (record)
      const payRes = await client.query(
        `
        INSERT INTO payments
          (tenant_id, unit_id, amount, method, source, tx_id, msisdn, paid_at, description, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, NOW()),$9,$10)
        RETURNING id, tenant_id, unit_id, amount, method, source, tx_id, msisdn, paid_at, description, notes, created_at
        `,
        [tenantId, unitId ?? null, amt, method ?? null, source ?? null, txId ?? null, msisdn ?? null, paidAt ?? null, description ?? null, notes ?? null]
      );
      const payment = payRes.rows[0];

      // 2) Ledger CREDIT for the payment
      await client.query(
        `
        INSERT INTO ledger
          (tenant_id, unit_id, kind, amount, ref_type, ref_id)
        VALUES ($1,$2,'CREDIT',$3,'payment',$4)
        `,
        [tenantId, unitId ?? null, amt, payment.id]
      );

      // 3) Recompute summary for this tenant
      const summary = await recomputeTenantSummary(client, tenantId);

      await client.query("COMMIT");
      res.json({ payment, summary });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export default router;

// util: recompute balances from the ledger
async function recomputeTenantSummary(client: any, tenantId: string) {
  const totals = await client.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN kind='DEBIT'  THEN amount END),0) AS total_debits,
      COALESCE(SUM(CASE WHEN kind='CREDIT' THEN amount END),0) AS total_credits
    FROM ledger
    WHERE tenant_id = $1 AND deleted_at IS NULL
    `,
    [tenantId]
  );
  const totalDebits = Number(totals.rows[0].total_debits || 0);
  const totalCredits = Number(totals.rows[0].total_credits || 0);
  const balance_now = totalDebits - totalCredits; // >0 owes, <0 prepaid

  const status = balance_now > 0 ? "Overdue" : balance_now < 0 ? "Prepaid" : "Cleared";

  const mtd = await client.query(
    `
    SELECT COALESCE(SUM(amount),0) AS mtd_paid
    FROM ledger
    WHERE tenant_id=$1 AND kind='CREDIT'
      AND date_trunc('month', ts) = date_trunc('month', NOW())
      AND deleted_at IS NULL
    `,
    [tenantId]
  );
  const mtd_paid = Number(mtd.rows[0].mtd_paid || 0);

  // Your monthly charge source (per unit/lease)
  const mdueRes = await client.query(
    `
    SELECT COALESCE(monthly_rent,0) AS monthly_due
    FROM tenant_rent_plan
    WHERE tenant_id=$1
    LIMIT 1
    `,
    [tenantId]
  );
  const monthly_due = Number(mdueRes.rows[0]?.monthly_due || 0);
  const current_month_due = Math.max(0, monthly_due - mtd_paid);
  const arrears = Math.max(0, balance_now);

  return { tenant_id: tenantId, monthly_due, mtd_paid, current_month_due, arrears, balance_now, status };
}
