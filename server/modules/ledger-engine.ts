// server/modules/ledger-engine.ts
import { db, sql } from "../db";

export type LedgerDirection = "DEBIT" | "CREDIT";
export type LedgerEntryKind =
  | "INVOICE"
  | "PAYMENT"
  | "ADJUSTMENT"
  | "OPENING_BALANCE"
  | string;

/**
 * Shape used by the finance summary endpoint:
 *
 *   GET /api/tenants/summary  →  TenantFinanceSummary[]
 *
 * We expose:
 *   - rent, paidThisMonth, arrearsToDate, balance
 *   - legacy aliases: currentMonthDue, amountPaidMtd, balanceNow
 */
export type TenantFinanceSummary = {
  tenantId: string;
  tenantName: string | null; // reserved for future joins to users
  unit: string | null;       // reserved for future joins to units

  // main fields
  rent: number;
  paidThisMonth: number;
  arrearsToDate: number;
  balance: number;

  // legacy aliases used by existing UI
  currentMonthDue: number;
  amountPaidMtd: number;
  balanceNow: number;

  status: "Cleared" | "Overdue" | "Prepaid";
};

export type TenantLedgerSummary = TenantFinanceSummary;

export type TenantLedgerEntry = {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  type: LedgerDirection; // we use "DEBIT" / "CREDIT" here
  amount: number;
  description: string | null;
  meta: Record<string, any>;
  runningBalance: number;
};

/* ---------------- helpers ---------------- */

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/*  Low-level insert helpers – aligned to your ledger_entries schema  */
/* ------------------------------------------------------------------ */
/**
 * Physical table (you shared):
 *
 *   tenant_id    uuid  NOT NULL  -- FK → users(id)
 *   unit_id      uuid
 *   lease_id     uuid
 *   property_id  uuid
 *   invoice_id   uuid
 *   payment_id   uuid
 *   entry_type   ledger_entry_kind      -- e.g. 'INVOICE', 'PAYMENT', ...
 *   direction    ledger_entry_direction -- 'DEBIT' | 'CREDIT'
 *   amount       numeric(14,2) NOT NULL
 *   effective_at timestamptz   NOT NULL DEFAULT now()
 *   description  text
 *   source       text          NOT NULL
 *   created_at   timestamptz   NOT NULL DEFAULT now()
 */
export async function insertLedgerEntry(params: {
  tenantId: string;
  amount: number;
  direction: LedgerDirection;             // 'DEBIT' or 'CREDIT'
  entryType?: LedgerEntryKind;           // default depends on usage
  effectiveAt?: string | Date;           // optional, defaults to now()
  description?: string | null;
  source?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  propertyId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
}) {
  const {
    tenantId,
    amount,
    direction,
    entryType = "INVOICE",
    effectiveAt,
    description,
    source,
    unitId,
    leaseId,
    propertyId,
    invoiceId,
    paymentId,
  } = params;

  if (!tenantId) {
    throw new Error("insertLedgerEntry: tenantId is required");
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("insertLedgerEntry: amount must be a positive number");
  }

  const eff =
    typeof effectiveAt === "string"
      ? new Date(effectiveAt)
      : effectiveAt instanceof Date
      ? effectiveAt
      : new Date();

  await db.execute(sql`
    INSERT INTO ledger_entries (
      tenant_id,
      unit_id,
      lease_id,
      property_id,
      invoice_id,
      payment_id,
      entry_type,
      direction,
      amount,
      effective_at,
      description,
      source,
      created_at
    )
    VALUES (
      ${tenantId},
      ${unitId ?? null},
      ${leaseId ?? null},
      ${propertyId ?? null},
      ${invoiceId ?? null},
      ${paymentId ?? null},
      ${entryType}::ledger_entry_kind,
      ${direction}::ledger_entry_direction,
      ${amt},
      ${eff},
      ${description ?? null},
      ${source ?? (entryType === "PAYMENT" ? "counter" : "manual-invoice")},
      now()
    )
  `);
}

/** Convenience wrapper: DEBIT (charges, invoices, arrears) */
export async function insertLedgerDebit(params: {
  tenantId: string;
  amount: number;
  effectiveAt?: string | Date;
  description?: string | null;
  source?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  propertyId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  entryType?: LedgerEntryKind;
}) {
  return insertLedgerEntry({
    ...params,
    direction: "DEBIT",
    entryType: params.entryType ?? "INVOICE",
  });
}

/** Convenience wrapper: CREDIT (payments, waivers) */
export async function insertLedgerCredit(params: {
  tenantId: string;
  amount: number;
  effectiveAt?: string | Date;
  description?: string | null;
  source?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  propertyId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  entryType?: LedgerEntryKind;
}) {
  return insertLedgerEntry({
    ...params,
    direction: "CREDIT",
    entryType: params.entryType ?? "PAYMENT",
  });
}

/* ------------------------------------------------------------------ */
/*     Finance summary used by GET /api/tenants/summary (ledger)      */
/* ------------------------------------------------------------------ */

/**
 * NEW: This summary is **purely ledger-based**.
 *
 * - We aggregate all DEBIT/CREDIT entries in ledger_entries.
 * - For current month:
 *     currentMonthDue  = total DEBIT this month
 *     amountPaidMtd    = total CREDIT this month
 * - Lifetime:
 *     balance          = Σ(DEBIT) - Σ(CREDIT)
 *     arrearsToDate    = max(balance, 0)
 */
export async function getAllTenantLedgerSummaries(): Promise<TenantFinanceSummary[]> {
  const { rows } = await db.execute<{
    tenantId: string;
    rent: string | number | null;
    paidThisMonth: string | number | null;
    arrearsToDate: string | number | null;
    balance: string | number | null;
    status: string;
  }>(sql`
    WITH per_tenant AS (
      SELECT
        tenant_id,
        SUM(CASE WHEN direction = 'DEBIT'  THEN amount ELSE 0 END) AS total_debits,
        SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) AS total_credits,
        SUM(
          CASE
            WHEN direction = 'DEBIT'  THEN amount
            WHEN direction = 'CREDIT' THEN -amount
            ELSE 0
          END
        ) AS balance
      FROM ledger_entries
      GROUP BY tenant_id
    ),
    mtd AS (
      SELECT
        tenant_id,
        SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) AS paid_this_month,
        SUM(CASE WHEN direction = 'DEBIT'  THEN amount ELSE 0 END) AS debits_this_month
      FROM ledger_entries
      WHERE effective_at >= date_trunc('month', now())
        AND effective_at <  date_trunc('month', now()) + interval '1 month'
      GROUP BY tenant_id
    )
    SELECT
      p.tenant_id::text                                   AS "tenantId",
      COALESCE(m.debits_this_month, 0)                    AS "rent",
      COALESCE(m.paid_this_month, 0)                      AS "paidThisMonth",
      GREATEST(p.balance, 0)                              AS "arrearsToDate",
      p.balance                                           AS "balance",
      CASE
        WHEN p.balance <  0 THEN 'Prepaid'
        WHEN p.balance =  0 THEN 'Cleared'
        ELSE                 'Overdue'
      END                                                 AS "status"
    FROM per_tenant p
    LEFT JOIN mtd m ON m.tenant_id = p.tenant_id
    ORDER BY p.tenant_id;
  `);

  return rows.map((r) => {
    const rent = toNum(r.rent);
    const paidThisMonth = toNum(r.paidThisMonth);
    const arrearsToDate = toNum(r.arrearsToDate);
    const balance = toNum(r.balance);

    const currentMonthDue = rent;
    const amountPaidMtd = paidThisMonth;
    const balanceNow = balance;

    const status =
      r.status === "Prepaid"
        ? "Prepaid"
        : r.status === "Cleared"
        ? "Cleared"
        : "Overdue";

    return {
      tenantId: r.tenantId,
      tenantName: null,
      unit: null,
      rent,
      paidThisMonth,
      arrearsToDate,
      balance,
      currentMonthDue,
      amountPaidMtd,
      balanceNow,
      status,
    };
  });
}

/** Optional single-tenant helper (used by hooks/helpers if needed) */
export async function getTenantLedgerSummary(
  tenantId: string
): Promise<TenantFinanceSummary | null> {
  if (!tenantId) return null;
  const all = await getAllTenantLedgerSummaries();
  return all.find((t) => t.tenantId === tenantId) ?? null;
}

/* ------------------------------------------------------------------ */
/*   Full ledger for a tenant with running balance (ledger_entries)   */
/* ------------------------------------------------------------------ */

export async function getTenantLedgerEntriesWithBalance(
  tenantId: string,
  unitId?: string,
  limit = 50
): Promise<TenantLedgerEntry[]> {
  if (!tenantId) return [];

  const { rows } = await db.execute<any>(sql`
    SELECT
      id,
      entry_type,
      direction,
      amount,
      description,
      source,
      effective_at,
      SUM(
        CASE
          WHEN direction = 'DEBIT'  THEN amount
          WHEN direction = 'CREDIT' THEN -amount
          ELSE 0
        END
      ) OVER (
        PARTITION BY tenant_id
        ORDER BY effective_at, created_at, id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS running_balance
    FROM ledger_entries
    WHERE tenant_id = ${tenantId}
      ${unitId ? sql`AND unit_id = ${unitId}` : sql``}
    ORDER BY effective_at DESC, created_at DESC, id DESC
    LIMIT ${limit}
  `);

  let fallbackRunning = 0;

  return rows.map((r: any): TenantLedgerEntry => {
    const amount = Number(r.amount ?? 0);

    // If running_balance window function is present, use it; otherwise compute locally.
    if (r.running_balance != null) {
      fallbackRunning = Number(r.running_balance);
    } else {
      const delta =
        String(r.direction) === "DEBIT" ? amount : String(r.direction) === "CREDIT" ? -amount : 0;
      fallbackRunning += delta;
    }

    const eff =
      r.effective_at instanceof Date
        ? r.effective_at
        : new Date(String(r.effective_at));

    return {
      id: String(r.id),
      // full ISO timestamp so UI can show exact date & time
      date: eff.toISOString(),
      type: String(r.direction) as LedgerDirection,
      amount,
      description: r.description ?? null,
      meta: {
        entryType: r.entry_type ?? null,
        source: r.source ?? null,
      },
      runningBalance: fallbackRunning,
    };

  });
}

/* ------------------------------------------------------------------ */
/*   Monthly rent DEBIT generation (legacy bulk invoicing endpoint)   */
/* ------------------------------------------------------------------ */

/**
 * Used by POST /api/rent/generate-monthly-invoices (legacy route).
 *
 * It creates one INVOICE / DEBIT ledger entry per active lease
 * for the given month, and is idempotent per (tenant, monthLabel).
 */
export async function generateMonthlyRentDebits(
  runDate?: Date
): Promise<{ generated: number; monthLabel: string }> {
  const now = runDate ?? new Date();

  const monthLabel = now.toLocaleString("en-KE", {
    month: "short",
    year: "numeric",
  }); // e.g. "Nov 2025"

  const description = `Monthly Rent – ${monthLabel}`;

  const { rows } = await db.execute<any>(sql`
    INSERT INTO ledger_entries (
      tenant_id,
      unit_id,
      lease_id,
      property_id,
      invoice_id,
      payment_id,
      entry_type,
      direction,
      amount,
      effective_at,
      description,
      source,
      created_at
    )
    SELECT
      l.tenant_id                                AS tenant_id,
      l.unit_id                                  AS unit_id,
      l.id                                       AS lease_id,
      u.property_id                              AS property_id,
      NULL::uuid                                 AS invoice_id,
      NULL::uuid                                 AS payment_id,
      'INVOICE'::ledger_entry_kind               AS entry_type,
      'DEBIT'::ledger_entry_direction            AS direction,
      u.monthly_rent                             AS amount,
      ${now}::timestamptz                        AS effective_at,
      ${description}                             AS description,
      'auto-billing'                             AS source,
      now()                                      AS created_at
    FROM leases l
    JOIN units u ON u.id = l.unit_id
    WHERE
      l.status = 'active'
      AND u.monthly_rent IS NOT NULL
      AND u.monthly_rent > 0
      AND NOT EXISTS (
        SELECT 1
        FROM ledger_entries e
        WHERE
          e.tenant_id = l.tenant_id
          AND e.entry_type = 'INVOICE'
          AND e.direction  = 'DEBIT'
          AND e.description = ${description}
          AND date_trunc('month', e.effective_at) =
              date_trunc('month', ${now}::timestamptz)
      )
    RETURNING tenant_id;
  `);

  return {
    generated: rows.length,
    monthLabel,
  };
}
