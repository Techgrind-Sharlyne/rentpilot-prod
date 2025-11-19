import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

// POST /api/ledger/adjustments – manual arrears debit/credit
router.post("/adjustments", async (req, res) => {
  const {
    tenantId,
    unitId,
    propertyId,
    amount,
    reason,
    kind = "debit", // 'debit' = increase arrears, 'credit' = reduce arrears
  } = req.body || {};

  if (!tenantId || !amount) {
    return res.status(400).json({
      error: "VALIDATION",
      detail: "tenantId and amount are required",
    });
  }

  try {
    const absAmount = Math.abs(Number(amount));

    // 1) Insert into ledger_adjustments (for audit)
    const adjRows: any[] = await db.execute(sql`
      INSERT INTO ledger_adjustments (
        id,
        tenant_id,
        unit_id,
        property_id,
        amount,
        reason,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${tenantId},
        ${unitId || null},
        ${propertyId || null},
        ${absAmount},
        ${reason || null},
        now()
      )
      RETURNING *
    `);

    const adj = adjRows[0];

    // 2) Insert into ledger_entries
    const direction = kind === "credit" ? "credit" : "debit";

    await db.execute(sql`
      INSERT INTO ledger_entries (
        tenant_id,
        unit_id,
        property_id,
        lease_id,
        invoice_id,
        payment_id,
        entry_type,
        direction,
        amount,
        effective_at,
        description,
        source
      )
      VALUES (
        ${tenantId},
        ${unitId || null},
        ${propertyId || null},
        NULL,
        NULL,
        NULL,
        'adjustment',
        ${direction}::ledger_entry_direction,
        ${absAmount},
        now(),
        ${reason || "Manual arrears adjustment"},
        'manual_adjustment'
      )
    `);

    return res.status(201).json(adj);
  } catch (err: any) {
    console.error("POST /api/ledger/adjustments failed:", err?.message);
    return res.status(500).json({
      error: "LEDGER_ADJUSTMENT_FAILED",
      detail: err?.message || "unknown",
    });
  }
});

export default router;
