// client/src/hooks/useTenantFinanceHistory.ts
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type TenantFinanceHistoryItem = {
  id?: string;
  type?: "payment" | "adjustment" | "charge" | string;
  kind?: "debit" | "credit" | string;
  amount?: number | null;
  description?: string | null;
  source?: string | null;
  method?: string | null;
  createdAt?: string | null;
  runningBalance?: number | null;
};

async function fetchHistory(
  tenantId: string,
  unitId?: string,
  limit = 50
): Promise<TenantFinanceHistoryItem[]> {
  const params = new URLSearchParams();
  if (unitId) params.set("unitId", unitId);
  if (limit) params.set("limit", String(limit));

  const path = `/api/tenants/${encodeURIComponent(
    tenantId
  )}/finance-history${params.toString() ? `?${params.toString()}` : ""}`;

  return apiRequest("GET", path);
}

export function useTenantFinanceHistory(
  tenantId?: string,
  unitId?: string,
  limit = 50
) {
  const enabled = !!tenantId;

  const query = useQuery({
    queryKey: ["/api/tenants", tenantId, "finance-history", { unitId, limit }],
    queryFn: () => fetchHistory(tenantId!, unitId, limit),
    enabled,
    staleTime: 30_000,
  });

  return {
    history: query.data ?? [],
    ...query,
  };
}
