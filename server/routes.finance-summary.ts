// server/routes.finance-summary.ts
import { Request, Response, NextFunction } from "express";
import {
  getAllTenantLedgerSummaries,
  generateMonthlyRentDebits,
} from "./modules/ledger-engine";

/**
 * GET /api/tenants/summary
 *
 * Returns the ledger-based finance snapshot for ALL tenants:
 * - rent
 * - paidThisMonth
 * - arrearsToDate
 * - balance
 * - status
 */
export async function getTenantFinanceSummary(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const summaries = await getAllTenantLedgerSummaries();
    res.json(summaries);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rent/generate-monthly-invoices
 *
 * Generates one DEBIT ledger entry per active tenant for the current month:
 *   description: "Monthly Rent – Mon YYYY"
 *   amount:      unit.monthly_rent
 *
 * Idempotent per month (per tenant).
 */
export async function generateMonthlyInvoices(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await generateMonthlyRentDebits();
    res.json(result); // { generated, monthLabel }
  } catch (err) {
    next(err);
  }
}
