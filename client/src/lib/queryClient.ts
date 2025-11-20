// client/src/lib/queryClient.ts

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL?.trim() || `${window.location.origin}/api`);

function buildApiUrl(path: string): string {
  // If it's already an absolute URL, just return it
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  let clean = path.trim();

  // 💥 IMPORTANT: strip any leading "/api" in the *path*.
  // So "/api/auth/login" → "/auth/login"
  if (clean.startsWith("/api/")) {
    clean = clean.slice(4); // remove "/api"
  } else if (clean === "/api") {
    clean = "/";
  }

  // Ensure path starts with a single "/"
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }

  return `${API_BASE_URL}${clean}`;
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = buildApiUrl(path);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }

  try {
    return (await res.json()) as T;
  } catch {
    // some endpoints might return empty 204 responses
    return {} as T;
  }
}
