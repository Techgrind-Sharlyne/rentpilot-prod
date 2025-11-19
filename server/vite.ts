import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const ts = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${ts} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Root of the client app (has index.html and src/)
  const clientRoot = path.resolve(__dirname, "..", "client");

  const vite: ViteDevServer = await createViteServer({
    root: clientRoot,
    appType: "custom",
    server: {
      middlewareMode: true,
      hmr: { server },
      port: 5173,
      host: "127.0.0.1",
      proxy: {
        "/api": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
        },
      },
      fs: {
        allow: [clientRoot, path.resolve(__dirname, "..")],
      },
    },
    plugins: [], // we rely on client/vite.config.ts for plugins if needed
    configFile: path.resolve(clientRoot, "vite.config.ts"), // load the client's config if present
  });

  // Vite middlewares (HMR, /@vite, /src, etc.)
  app.use(vite.middlewares);

  // Express 5-safe SPA fallback — do NOT swallow /api
  app.get(/.*/, async (req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    try {
      const indexHtml = path.join(clientRoot, "index.html");
      let html = await fs.promises.readFile(indexHtml, "utf-8");

      // small cache-bust for main.tsx
      html = html.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      html = await vite.transformIndexHtml(req.originalUrl, html);
      res.status(200).setHeader("Content-Type", "text/html").end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Serve the built client in production
  const distPath = path.resolve(__dirname, "..", "client", "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Build not found at ${distPath}. Run: cd client && npm run build`
    );
  }

  app.use(express.static(distPath));

  // Express 5-safe fallback — do NOT swallow /api
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}
