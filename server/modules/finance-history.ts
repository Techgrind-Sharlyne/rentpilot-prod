import { sql } from "drizzle-orm";
import { db } from "../db";

export type TenantFinanceHistoryItem = {
  id: string;
  tenantId: string;
  unitId: string | null;
  type: "payment" | "charge" | "adjustment" | "other";
  kind?: "debit" | "credit";
  amount: number;
  description: string | null;
  source: string | null;
  method: string | null; // we don't have a column, will derive/null
  createdAt: string; // ISO string (when it took effect)
  runningBalance?: number | null;
  invoiceMonth?: string | null; // "YYYY-MM"
};

type GetHistoryParams = {
  tenantId: string;
  unitId?: string;
  limit?: number;
};

/**
 * Fetch tenant finance history from ledger_entries using your actual schema:
 *  - entry_type  (INVOICE | PAYMENT | ADJUSTMENT | ...)
 *  - direction   (DEBIT | CREDIT)
 *  - amount
 *  - description
 *  - source      (counter | manual-invoice | auto-billing | ...)
 *  - effective_at
 *  - created_at
 */
export async function getTenantFinanceHistory(
  params: GetHistoryParams
): Promise<TenantFinanceHistoryItem[]> {
  const { tenantId, unitId, limit = 10 } = params;

  const result: any = await db.execute(sql`
    SELECT
      le.id,
      le.tenant_id,
      le.unit_id,
      le.amount,
      le.entry_type,
      le.direction,
      le.description,
      le.source,
      le.effective_at,
      le.created_at,
      TO_CHAR(COALESCE(le.effective_at, le.created_at), 'YYYY-MM') AS period_month
    FROM ledger_entries le
    WHERE le.tenant_id = ${tenantId}
      ${unitId ? sql`AND le.unit_id = ${unitId}` : sql``}
    ORDER BY COALESCE(le.effective_at, le.created_at) DESC, le.id DESC
    LIMIT ${limit}
  `);

  // Normalize drizzle/pg result → always an array
  const rows: any[] = Array.isArray(result)
    ? result
    : Array.isArray(result?.rows)
    ? result.rows
    : [];

  return rows.map((row) => {
    const entryType = String(row.entry_type || "").toUpperCase();
    const direction = String(row.direction || "").toUpperCase();

    let type: TenantFinanceHistoryItem["type"] = "other";
    if (entryType === "PAYMENT") type = "payment";
    else if (entryType === "INVOICE") type = "charge";
    else if (entryType === "ADJUSTMENT") type = "adjustment";

    let kind: "debit" | "credit" | undefined;
    if (direction === "DEBIT") kind = "debit";
    else if (direction === "CREDIT") kind = "credit";

    const effective = row.effective_at ?? row.created_at;
    const createdAtIso =
      effective?.toISOString?.() ??
      new Date(effective).toISOString();

    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      unitId: row.unit_id ? String(row.unit_id) : null,
      type,
      kind,
      amount: Number(row.amount ?? 0),
      description: row.description ?? null,
      source: row.source ?? null,
      // we don’t have a dedicated method column, so we either mirror source or leave null
      method: null,
      createdAt: createdAtIso,
      runningBalance: null, // can be wired later if you add a column
      invoiceMonth: row.period_month ?? null, // "YYYY-MM"
    };
  });
}
