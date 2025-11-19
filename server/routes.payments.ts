// server/routes.payments.ts
import { Request, Response, NextFunction } from "express";
import { db, sql } from "./db";
import {
  insertLedgerCredit,
  insertLedgerDebit,
} from "./modules/ledger-engine";

/**
 * List all payments as CREDIT entries from the ledger.
 *
 * Shape matches the PaymentRow type used on the frontend:
 *   id, tenant_id, unit_id, amount, status, method, source, tx_id, msisdn, paid_at
 */
export async function listPayments(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { rows } = await db.execute<any>(sql`
      SELECT
        e.id,
        e.tenant_id,
        e.unit_id,
        e.amount,
        'paid'::text         AS status,
        NULL::text           AS method,
        e.source             AS source,
        NULL::text           AS tx_id,
        NULL::text           AS msisdn,
        e.effective_at       AS paid_at
      FROM ledger_entries e
      WHERE e.direction = 'CREDIT'::ledger_entry_direction
      ORDER BY e.effective_at DESC, e.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Record a payment as a ledger CREDIT.
 *
 * This is what the FinanceModal and "Add Rent / Quick Add" call via:
 *   POST /api/payments
 */
export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
      status,
      description,
      notes,
    } = req.body as {
      tenantId?: string;
      unitId?: string;
      amount?: number | string;
      method?: string;
      source?: string;
      txId?: string;
      msisdn?: string;
      paidAt?: string;
      status?: string;
      description?: string;
      notes?: string;
    };

    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res
        .status(400)
        .json({ message: "amount must be a positive number" });
    }

       const paidAtDate = paidAt ? new Date(paidAt) : new Date();

    // Mirror payment into the ledger as a CREDIT.
    await insertLedgerCredit({
      tenantId,
      amount: amt,
      effectiveAt: paidAtDate,                 // ← use user-selected Paid At
      description: description || "Rent payment",
      source: source ?? "counter",             // goes into ledger_entries.source
      unitId: unitId ?? null,                  // link to unit if provided
      // leaseId, propertyId, invoiceId, paymentId can be wired later if needed
      entryType: "PAYMENT",                    // explicit, though default would also be PAYMENT
    });


    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Manual DEBIT / CREDIT adjustments from “Adjust Arrears”.
 * This should be used rarely, e.g., for corrections.
 */
export async function createManualDebit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      tenantId,
      amount,
      reason,
      kind,
    } = req.body as {
      tenantId?: string;
      amount?: number | string;
      reason?: string;
      kind?: "debit" | "credit";
    };

    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res
        .status(400)
        .json({ message: "amount must be a positive number" });
    }

    const date = new Date();

    if (kind === "credit") {
      await insertLedgerCredit({
        tenantId,
        amount: amt,
        date,
        description: reason || "Manual credit adjustment",
        meta: {
          entryType: "ADJUSTMENT",
          source: "manual-adjustment",
        },
      });
    } else {
      await insertLedgerDebit({
        tenantId,
        amount: amt,
        date,
        description: reason || "Manual debit adjustment",
        meta: {
          entryType: "ADJUSTMENT",
          source: "manual-adjustment",
        },
      });
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Stubs so these routes never 500 even if not fully used yet.
 */
export async function listUnallocated(
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  res.json([]);
}

export async function allocatePayment(
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  res.json({ ok: true, message: "Allocation not implemented yet." });
}

export async function kcbWebhook(
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // TODO: parse real KCB payload and insert CREDIT(s) with entryType = 'PAYMENT' and source = 'kcb-mpesa'
  res.json({ ok: true });
}
