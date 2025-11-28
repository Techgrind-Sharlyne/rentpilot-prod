import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/**
 * Auth hook:
 * - Reads and maintains auth state under the key ["/api/auth/user"].
 * - On initial mount, attempts to fetch /api/auth/user using the session cookie.
 * - Login seeds this cache; logout or 401 clears it.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const current = await apiRequest("GET", "/api/auth/user");
        return current as any;
      } catch (err: any) {
        if (err?.status === 401) {
          // not logged in
          queryClient.setQueryData(["/api/auth/user"], null);
          return null;
        }
        throw err;
      }
    },
    // Seed from any existing cache (e.g. set during login)
    initialData: () =>
      (queryClient.getQueryData(["/api/auth/user"]) as any) ?? null,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    isError,
  };
}
