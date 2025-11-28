// client/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

/**
 * Global React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid hammering the API
      staleTime: 60_000, // 1 minute default
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error: any) => {
        // Don't retry auth failures endlessly
        if (String(error?.message || "").includes("401")) return false;
        return failureCount < 2;
      },
    },
  },
});

/**
 * API base:
 *
 * - If VITE_API_BASE_URL is set, use it.
 *   e.g. http://127.0.0.1:5000/api
 * - Else default to same origin + /api (works with Vite proxy + VPS nginx).
 *
 * NOTE:
 * For local dev, if you're seeing session / cookie issues,
 * it's often easiest to **leave VITE_API_BASE_URL undefined**
 * and let this fall back to `${window.location.origin}/api`,
 * with Vite proxying /api → 127.0.0.1:5000.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  `${window.location.origin}/api`;

function buildApiUrl(path: string): string {
  if (!path) return API_BASE_URL;

  // If it's already absolute, just return it
  if (/^https?:\/\//i.test(path)) return path;

  let clean = path.trim();

  // Strip leading "/api" because API_BASE_URL already includes it
  if (clean.startsWith("/api/")) clean = clean.slice(4);
  else if (clean === "/api") clean = "/";

  if (!clean.startsWith("/")) clean = "/" + clean;

  return `${API_BASE_URL}${clean}`;
}

type ApiError = Error & { status?: number; payload?: any };

/**
 * Core API request helper used across the app.
 *
 * Keeps the existing signature:
 *   apiRequest(method, path, body?, init?)
 */
export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = buildApiUrl(path);
  const hasBody = body !== undefined && body !== null;

  const res = await fetch(url, {
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    credentials: "include", // ✅ ALWAYS send cookies for session auth
    ...init,
  });

  if (!res.ok) {
    let payload: any = null;
    let text = "";

    try {
      text = await res.text();
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text || null;
    }

    const err: ApiError = new Error(
      payload?.message || `${res.status}: ${res.statusText}`
    );
    err.status = res.status;
    err.payload = payload;

    // If session expired, clear auth cache so UI can reroute cleanly
    if (res.status === 401) {
      queryClient.setQueryData(["/api/auth/user"], null);
    }

    throw err;
  }

  try {
    return (await res.json()) as T;
  } catch {
    // some endpoints might return empty 204 responses
    return {} as T;
  }
}
