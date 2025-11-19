// server/routes.rent-ledger.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { getTenantLedgerEntriesWithBalance } from "./modules/ledger-engine";

const router = Router();

/**
 * GET /api/rent/ledger/:tenantId
 *
 * Returns the full ledger for a tenant with running balance:
 *
 * [
 *   {
 *     id,
 *     date,           // "YYYY-MM-DD"
 *     type,           // "DEBIT" | "CREDIT"
 *     amount,
 *     description,
 *     meta,
 *     runningBalance  // cumulative balance after this entry
 *   },
 *   ...
 * ]
 */
router.get(
  "/api/rent/ledger/:tenantId",
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      if (!tenantId) {
        return res
          .status(400)
          .json({ message: "tenantId is required in path" });
      }

      const entries = await getTenantLedgerEntriesWithBalance(tenantId);
      return res.json(entries);
    } catch (err: any) {
      console.error(
        "[GET /api/rent/ledger/:tenantId] error:",
        err?.message || err
      );
      return res.status(500).json({
        message: "LEDGER_FETCH_FAILED",
        detail: err?.message || "unknown",
      });
    }
  }
);

export default router;
