// server/routes.tenants.ts
import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

// Create tenant
router.post("/", async (req, res) => {
  try {
    const { full_name, phone, email = null, status = "ACTIVE" } = req.body || {};
    if (!full_name || !phone) {
      return res
        .status(400)
        .json({ error: "VALIDATION", detail: "full_name and phone are required" });
    }

    const rows: any[] = await db.execute(sql`
      INSERT INTO tenants (full_name, phone, email, status)
      VALUES (${full_name}, ${phone}, ${email}, ${status})
      RETURNING id
    `);

    const { id } = rows[0];
    res.status(201).json({ id });
  } catch (err: any) {
    console.error("POST /api/tenants failed:", {
      body: req.body,
      error: err?.message,
    });
    res.status(500).json({
      error: "TENANT_CREATE_FAILED",
      detail: err?.message || "unknown",
    });
  }
});

// List tenants (simple)
router.get("/", async (_req, res) => {
  try {
    const rows: any[] = await db.execute(sql`
      SELECT id, full_name, phone, email, status, created_at
      FROM tenants
      ORDER BY id DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (e: any) {
    console.error("GET /api/tenants:", e?.message);
    res.status(500).json([]);
  }
});

export default router;
