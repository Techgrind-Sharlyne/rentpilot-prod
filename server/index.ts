// server/index.ts
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import session from "express-session";

import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import { initializeEnterpriseDatabase, verifyDbConnectionOnce } from "./db";

// Feature routes
import dashboardRoutes from "./routes.dashboard";
import expendituresRoutes from "./routes.expenditures";

// Finance summary (ledger-based)
import { getTenantFinanceSummary } from "./routes.finance-summary";

import {
  listPayments,
  createPayment,
  allocatePayment,
  listUnallocated,
  createManualDebit,
  kcbWebhook,
} from "./routes.payments";

import kcbMpesaWebhookRouter from "./routes.webhooks.kcb-mpesa";
import tenantsFinanceHistoryRouter from "./routes.tenants.finance-history";

// Invoices engine (new)
import {
  generateInvoices,
  generateMonthlyInvoicesLegacy,
} from "./routes.invoices";

// -----------------------------------------------------
// App bootstrap
// -----------------------------------------------------
const app = express();
app.set("trust proxy", 1);

// -----------------------------
// CORS + Sessions
// -----------------------------
const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// -----------------------------
// Parsers
// -----------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// -----------------------------
// API Logger (SAFE)
// -----------------------------
app.use((req, res, next) => {
  const start = Date.now();
  let captured: any;

  const originalJson = res.json.bind(res);
  (res as any).json = (payload: any) => {
    captured = payload;
    return originalJson(payload);
  };

  res.on("finish", () => {
    if (!req.path.startsWith("/api")) return;
    let line = `${req.method} ${req.path} ${res.statusCode} in ${
      Date.now() - start
    }ms`;
    if (captured) {
      try {
        const snippet = JSON.stringify(captured);
        line += ` :: ${
          snippet.length > 160 ? snippet.slice(0, 157) + "..." : snippet
        }`;
      } catch {
        // ignore logging JSON errors
      }
    }
    log(line);
  });

  next();
});

// -----------------------------
// Static uploads
// -----------------------------
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// -----------------------------
// Finance & Payments endpoints
// -----------------------------
app.use(kcbMpesaWebhookRouter);
app.use(tenantsFinanceHistoryRouter);

// Payments CRUD
app.get("/api/payments", listPayments);
app.post("/api/payments", createPayment);
app.post("/api/payments/:id/allocate", allocatePayment);
app.get("/api/payments/unallocated", listUnallocated);

// Manual ledger adjustments
app.post("/api/ledger/adjustments", createManualDebit);

// KCB webhook
app.post("/api/webhooks/kcb", kcbWebhook);

// Ledger finance summary
app.get("/api/tenants/summary", getTenantFinanceSummary);

// Invoices engine
app.post("/api/invoices/generate", generateInvoices);

// Legacy alias so older code still works (now uses new engine)
app.post(
  "/api/rent/generate-monthly-invoices",
  generateMonthlyInvoicesLegacy
);

// -----------------------------
// Misc endpoints
// -----------------------------
app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    service: "RentPilot API",
    time: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// -----------------------------
// Feature routers
// -----------------------------
if (dashboardRoutes) app.use("/api/dashboard", dashboardRoutes);
if (expendituresRoutes) app.use("/api", expendituresRoutes);

// -----------------------------
// Bootstrap (DB + server start)
// -----------------------------
(async () => {
  try {
    await initializeEnterpriseDatabase();
    await verifyDbConnectionOnce();
    log("[ok] database initialized");
  } catch (error: any) {
    log(`[warn] database init failed: ${error?.message ?? error}`);
  }

  const server = await registerRoutes(app);

  // -----------------------------
  // ✅ Global Error Handler
  // -----------------------------
  app.use(
    (err: any, req: Request, res: Response, next: NextFunction) => {
      // This MUST have 4 args so Express treats it as an error handler
      console.error("GLOBAL ERROR HANDLER:", err);

      const status = err?.statusCode ?? err?.status ?? 500;
      const message = err?.message ?? "Internal Server Error";

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({
        ok: false,
        error: message,
      });
    }
  );

  if (app.get("env") === "production") {
    serveStatic(app);
  }

  const port = Number(process.env.PORT ?? 5000);
  const host =
    process.env.HOST ??
    (process.platform === "win32" ? "127.0.0.1" : "0.0.0.0");

  server.listen({ port, host }, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
