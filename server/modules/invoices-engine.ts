// server/modules/invoices-engine.ts
import { generateMonthlyRentDebits, insertLedgerDebit } from "./ledger-engine";

type BulkMonthlyOptions = {
  month?: string; // "2025-11" (YYYY-MM), optional
};

type SingleInvoiceItem = {
  kind: "rent" | "arrears" | "utility" | "breakage" | "other";
  description: string;
  amount: number;
};

type SingleInvoiceOptions = {
  tenantId: string;
  unitId?: string;
  items: SingleInvoiceItem[];
  month?: string; // optional billing period label
};

/**
 * Resolve a month key like "2025-11" into:
 * - monthKey: "2025-11"
 * - periodStart: first day of that month (UTC)
 */
function resolveMonthKey(input?: string): {
  monthKey: string;
  periodStart: Date;
} {
  let year: number;
  let month: number; // 1–12

  if (input && /^\d{4}-\d{2}$/.test(input)) {
    year = Number(input.slice(0, 4));
    month = Number(input.slice(5, 7));
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  return { monthKey, periodStart };
}

/**
 * Generate MONTHLY RENT debits for all active tenants.
 *
 * Delegates to generateMonthlyRentDebits (which writes to ledger_entries):
 *   - entry_type = 'INVOICE'
 *   - direction  = 'DEBIT'
 *   - amount     = monthly_rent
 *   - description = "Monthly Rent – Mon YYYY"
 *
 * This is idempotent per month/tenant.
 */
export async function generateMonthlyRentInvoices(
  options: BulkMonthlyOptions = {}
): Promise<{ generated: number; monthLabel: string }> {
  const { monthKey, periodStart } = resolveMonthKey(options.month);

  // Here periodStart is passed as the "run date" so the engine can
  // derive monthLabel and meta month consistently.
  const result = await generateMonthlyRentDebits(periodStart);

  return {
    generated: result.generated,
    // Prefer the human-readable label from the engine; fall back to "YYYY-MM".
    monthLabel: result.monthLabel || monthKey,
  };
}

/**
 * Single-tenant invoice with line items (arrears, utilities, breakages, etc.).
 *
 * For each item, we:
 *   - create a DEBIT row in public.ledger_entries
 *   - entry_type = 'INVOICE'
 *   - direction  = 'DEBIT'
 *   - source     = 'manual-invoice'
 *
 * The UI uses GET /api/tenants/:tenantId/finance-history +
 * /api/tenants/summary to reflect these in balances and ledger.
 */
export async function generateSingleInvoice(
  options: SingleInvoiceOptions
): Promise<{ tenantId: string; total: number; monthLabel: string }> {
  const { tenantId, unitId, items, month } = options;
  const { monthKey } = resolveMonthKey(month);

  if (!tenantId) throw new Error("tenantId is required");
  if (!items || !items.length) throw new Error("At least one item is required");

  let total = 0;

  for (const item of items) {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid amount for invoice item: ${item.description}`);
    }

    total += amount;

    await insertLedgerDebit({
      tenantId,
      amount,
      effectiveAt: new Date(),          // now; could be extended to accept a custom date
      description: item.description,
      source: "manual-invoice",         // stored in ledger_entries.source
      unitId: unitId ?? null,
      entryType: "INVOICE",             // mark as invoice charge
      // leaseId / propertyId / invoiceId / paymentId can be wired later
    });
  }

  return { tenantId, total, monthLabel: monthKey };
}
