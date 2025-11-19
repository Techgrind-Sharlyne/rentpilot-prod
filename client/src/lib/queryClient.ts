// client/src/lib/queryClient.ts
import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const API_BASE_URL = "http://127.0.0.1:5000";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

export const getQueryFn =
  ({ on401 }: { on401: "returnNull" | "throw" }): QueryFunction =>
  async ({ queryKey }) => {
    const fullUrl = `${API_BASE_URL}${queryKey.join("/")}`;
    const res = await fetch(fullUrl, { credentials: "include" });

    if (on401 === "returnNull" && res.status === 401) return null;
    await throwIfResNotOk(res);

    return res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
