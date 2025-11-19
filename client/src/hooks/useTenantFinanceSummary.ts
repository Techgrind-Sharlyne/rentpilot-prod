// client/src/hooks/useTenantFinanceSummary.ts
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type TenantFinanceSummary = {
  tenantId: string;
  tenantName: string | null;
  unit: string | null;
  rent: number;
  paidThisMonth: number;
  arrearsToDate: number;
  balance: number;
  currentMonthDue: number;
  amountPaidMtd: number;
  balanceNow: number;
  status: "Cleared" | "Overdue" | "Prepaid" | string;
};

async function fetchAllSummaries(): Promise<TenantFinanceSummary[]> {
  return apiRequest("GET", "/api/tenants/summary");
}

/**
 * If tenantId is provided, returns `tenantSummary` for that tenant.
 * Otherwise just exposes the raw query (used by pages like Rent Income).
 */
export function useTenantFinanceSummary(tenantId?: string) {
  const query = useQuery({
    queryKey: ["/api/tenants/summary"],
    queryFn: fetchAllSummaries,
    staleTime: 60_000,
  });

  const tenantSummary = tenantId
    ? query.data?.find((t) => t.tenantId === tenantId)
    : undefined;

  return {
    ...query,
    tenantSummary,
  };
}
