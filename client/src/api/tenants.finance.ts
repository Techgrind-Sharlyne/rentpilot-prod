// client/src/api/tenants.finance.ts
export type TenantFinanceSummary = {
  tenantId: string;
  amountPaidMtd: number;
  arrearsToDate: number;
  currentMonthDue: number;
  balanceNow: number;
  status: "Cleared" | "Overdue" | "Prepaid";
};

const base = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetchTenantFinanceSummary(): Promise<TenantFinanceSummary[]> {
  const r = await fetch(`${base}/tenants/summary`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
