// server/routes.tenants.finance-history.ts
import { Router } from "express";
import type { Request, Response } from "express";
import {
  getTenantFinanceHistory,
  type TenantFinanceHistoryItem,
} from "./modules/finance-history";

const router = Router();

/**
 * GET /api/tenants/:tenantId/finance-history
 *
 * Query params:
 *  - unitId (optional)
 *  - limit (optional, default 10)
 *
 * Response:
 *  TenantFinanceHistoryItem[]
 */
router.get(
  "/api/tenants/:tenantId/finance-history",
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { unitId, limit } = req.query;

      if (!tenantId) {
        return res.status(400).json({ message: "tenantId is required" });
      }

      const parsedLimit =
        typeof limit === "string" && limit.trim()
          ? Math.min(Math.max(Number(limit) || 10, 1), 100)
          : 10;

      const history: TenantFinanceHistoryItem[] = await getTenantFinanceHistory({
        tenantId,
        unitId: typeof unitId === "string" ? unitId : undefined,
        limit: parsedLimit,
      });

      res.json(history);
    } catch (error: any) {
      console.error("Error fetching tenant finance history:", error);
      res.status(500).json({ message: "Failed to fetch tenant finance history" });
    }
  }
);

export default router;
