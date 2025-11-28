// server/index.ts
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import session from "express-session";

import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import { initializeEnterpriseDatabase, verifyDbConnectionOnce, db } from "./db";

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

// Auth guard
import { isAuthenticated } from "./auth";

// -----------------------------------------------------
// App bootstrap
// -----------------------------------------------------
const app = express();
app.set("trust proxy", 1);

// -----------------------------
// CORS (dev + prod safe)
// -----------------------------
const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  process.env.CLIENT_ORIGIN || "",
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow no-origin (Postman, curl, etc.)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

// -----------------------------
// Parsers
// -----------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// -----------------------------
// Sessions (ONE place)
// -----------------------------
const SESSION_SECRET = process.env.SESSION_SECRET || "rentpilot-dev-session-secret";

console.log(
  "[auth]",
  process.env.NODE_ENV === "production"
    ? "Using session store with secure cookies"
    : "Using in-memory session store (dev)"
);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax", // works across 127.0.0.1:5173 -> 127.0.0.1:5000
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// -----------------------------
// Auth endpoints (login/logout/current user)
// -----------------------------

/**
 * POST /api/auth/login
 * Body: { username, password }
 *
 * For now:
 * - tries to find a user in DB by username/email (if schema matches)
 * - if none found and NODE_ENV !== "production", falls back to a dev user
 */
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  let user: any | null = null;

  try {
    // Adjust column names to match your real schema if needed
    const result = await db.execute(`
      SELECT id, first_name, last_name, email, role
      FROM users
      WHERE username = $1 OR email = $1
      LIMIT 1
    ` as any, [username]);

    const row = (result as any).rows?.[0] ?? null;

    if (row) {
      // TODO: plug in proper password hashing (bcrypt.compare) if you have password_hash
      user = {
        id: row.id,
        firstName: row.first_name ?? "User",
        lastName: row.last_name ?? "",
        email: row.email ?? username,
        role: row.role ?? "landlord",
      };
    }
  } catch (err) {
    console.log("[auth] DB auth lookup failed (will consider dev fallback)", err);
  }

  // If no DB user and in dev: allow a dev user so you're not blocked locally.
  if (!user) {
    if (process.env.NODE_ENV === "production") {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    console.log("[auth] No DB user found – using dev user (NODE_ENV != production)");

    user = {
      id: "dev-user",
      firstName: "Dev",
      lastName: "Admin",
      email: `${username}@example.dev`,
      role: "admin",
    };
  }

  // Store in session
  (req.session as any).userId = user.id;
  (req.session as any).user = user;

  console.log("[auth] login success:", {
    userId: user.id,
    sessionID: (req.session as any).id,
  });

  return res.json(user);
});

/**
 * POST /api/auth/logout
 * Destroys the session.
 */
app.post("/api/auth/logout", (req: Request, res: Response) => {
  const sid = (req.session as any)?.id;
  req.session.destroy((err) => {
    if (err) {
      console.log("[auth] logout failed", { error: err, sessionID: sid });
      return res.status(500).json({ message: "Failed to logout" });
    }
    console.log("[auth] logout success", { sessionID: sid });
    res.json({ ok: true });
  });
});

/**
 * GET /api/auth/user
 * Returns the current user from the session (or 401).
 */
app.get("/api/auth/user", async (req: Request, res: Response) => {
  const sess: any = req.session;
  if (!sess || !sess.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Prefer cached user
  if (sess.user) {
    return res.json(sess.user);
  }

  try {
    const result = await db.execute(`
      SELECT id, first_name, last_name, email, role
      FROM users
      WHERE id = $1
      LIMIT 1
    ` as any, [sess.userId]);

    const row = (result as any).rows?.[0] ?? null;
    if (!row) return res.status(401).json({ message: "Unauthorized" });

    const user = {
      id: row.id,
      firstName: row.first_name ?? "User",
      lastName: row.last_name ?? "",
      email: row.email ?? "",
      role: row.role ?? "landlord",
    };

    sess.user = user;
    return res.json(user);
  } catch (err) {
    console.log("[auth] failed to load user from DB", err);
    return res.status(500).json({ message: "Failed to load user" });
  }
});

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
if (dashboardRoutes) app.use("/api", dashboardRoutes);
if (expendituresRoutes) app.use("/api", expendituresRoutes);

// -----------------------------
// Bootstrap (DB + server start)
// -----------------------------
(async () => {
  try {
    await initializeEnterpriseDatabase();
    await verifyDbConnectionOnce();
    log("[express] [ok] database initialized");
  } catch (error: any) {
    log(`[express] [warn] database init failed: ${error?.message ?? error}`);
  }

  const server = await registerRoutes(app);

  // -----------------------------
  // ✅ Global Error Handler
  // -----------------------------
  app.use(
    (err: any, _req: Request, res: Response, next: NextFunction) => {
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
