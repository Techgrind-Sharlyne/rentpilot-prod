// client/src/api/useTenantFinanceSummary.ts
import { useQuery } from "@tanstack/react-query";
import { fetchTenantFinanceSummary } from "./tenants.finance";

export function useTenantFinanceSummary() {
  return useQuery({
    queryKey: ["tenants","finance","summary"],
    queryFn: fetchTenantFinanceSummary,
    staleTime: 60_000,
  });
}
