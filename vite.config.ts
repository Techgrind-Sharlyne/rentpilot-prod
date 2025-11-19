// client.vite.config.ts (used from project root via `--config client/vite.config.ts`)
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Explicit roots/paths
const projectRoot = __dirname;                 // .../RentPilot
const clientRoot = resolve(projectRoot, "client");
const sharedRoot = resolve(projectRoot, "shared");

export default defineConfig({
  root: clientRoot,            // run Vite from /client
  plugins: [react()],
  clearScreen: false,

  resolve: {
    alias: {
      "@": resolve(clientRoot, "src"), // import "@/..." from client/src
      "@shared": sharedRoot,           // import shared browser-safe code
    },
  },

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      // forward client requests to the Express API on :5000
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
    // allow importing files above the client root (e.g., ../shared)
    fs: {
      allow: [
        clientRoot,
        projectRoot,
        sharedRoot,
        searchForWorkspaceRoot(clientRoot),
      ],
    },
  },

  build: {
    outDir: resolve(clientRoot, "dist"), // outputs to client/dist
    emptyOutDir: true,
  },
});
