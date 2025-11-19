// server/routes.invoices.ts
import { Request, Response, NextFunction } from "express";
import {
  generateMonthlyRentInvoices,
  generateSingleInvoice,
} from "./modules/invoices-engine";

export async function generateInvoices(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { mode = "bulk-monthly" } = req.body || {};

    if (mode === "bulk-monthly") {
      const result = await generateMonthlyRentInvoices({
        month: req.body?.month,
      });
      return res.json(result);
    }

    if (mode === "single") {
      const { tenantId, unitId, items, month } = req.body || {};
      const result = await generateSingleInvoice({
        tenantId,
        unitId,
        items,
        month,
      });
      return res.json(result);
    }

    return res.status(400).json({ message: "Invalid mode" });
  } catch (err) {
    next(err);
  }
}

/**
 * Legacy route so your existing /api/rent/generate-monthly-invoices
 * no longer 500s and simply calls the new engine in bulk mode.
 */
export async function generateMonthlyInvoicesLegacy(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // treat as bulk-monthly for the current month
  (req as any).body = { ...(req.body || {}), mode: "bulk-monthly" };
  return generateInvoices(req, res, next);
}
