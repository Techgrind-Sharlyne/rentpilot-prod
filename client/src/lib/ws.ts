export function resolveWsUrl(token: string, path = "/") {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit && /^wss?:\/\//i.test(explicit)) {
    const base = explicit.replace(/\/$/, "");
    return `${base}${path}${explicit.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  }

  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    window.location.origin;

  const u = new URL(apiBase);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = path;
  u.search = `token=${encodeURIComponent(token)}`;
  return u.toString();
}

export function setupWebSocket(token: string, path = "/") {
  const url = resolveWsUrl(token, path);
  const ws = new WebSocket(url);

  ws.onopen = () => console.log("[WS] connected:", url);
  ws.onclose = (e) => console.warn("[WS] closed:", e.code, e.reason);
  ws.onerror = (e) => console.error("[WS] error:", e);
  ws.onmessage = (msg) => {
    // handle message payloads
  };

  return ws;
}
