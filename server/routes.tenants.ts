// server/routes.tenants.ts
import { Router } from "express";
import { db, sql } from "./db";

const router = Router();

function splitName(full: string | null): { firstName: string; lastName: string } {
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// Create tenant
router.post("/", async (req, res) => {
  try {
    const { full_name, phone, email = null, status = "ACTIVE" } = req.body || {};
    if (!full_name || !phone) {
      return res
        .status(400)
        .json({ error: "VALIDATION", detail: "full_name and phone are required" });
    }

    const { rows } = await db.execute<any>(sql`
      INSERT INTO tenants (full_name, phone, email, status)
      VALUES (${full_name}, ${phone}, ${email}, ${status})
      RETURNING id
    `);

    const row = rows?.[0];
    if (!row) {
      return res.status(500).json({
        error: "TENANT_CREATE_FAILED",
        detail: "no row returned from insert",
      });
    }

    res.status(201).json({ id: row.id });
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

// List tenants – enriched shape for UI with current lease + unit
router.get("/", async (_req, res) => {
  try {
    // One query: tenants + “current” lease + unit
    const { rows } = await db.execute<any>(sql`
      SELECT
        t.id                  AS tenant_id,
        t.full_name           AS full_name,
        t.phone               AS phone,
        t.email               AS email,
        t.status              AS tenant_status,
        t.created_at          AS tenant_created_at,

        l.id                  AS lease_id,
        l.status              AS lease_status,
        l.monthly_rent        AS lease_monthly_rent,
        l.start_date          AS lease_start_date,
        l.end_date            AS lease_end_date,
        l.move_in_date        AS lease_move_in_date,

        u.id                  AS unit_id,
        u.code                AS unit_number,
        u.property_id         AS unit_property_id
      FROM tenants t
      LEFT JOIN LATERAL (
        SELECT *
        FROM leases l
        WHERE l.tenant_id = t.id
        ORDER BY
          CASE
            WHEN l.status = 'ACTIVE' THEN 0
            WHEN l.status = 'PENDING' THEN 1
            ELSE 2
          END,
          l.start_date DESC NULLS LAST
        LIMIT 1
      ) l ON TRUE
      LEFT JOIN units u ON u.id = l.unit_id
      ORDER BY t.created_at DESC
      LIMIT 500
    `);

    const out = (rows || []).map((r: any) => {
      const { firstName, lastName } = splitName(r.full_name ?? null);

      return {
        id: r.tenant_id,
        fullName: r.full_name,
        firstName,
        lastName,
        email: r.email,
        phone: r.phone,
        status: (r.tenant_status || "").toString().toLowerCase(), // e.g. 'ACTIVE' -> 'active'
        createdAt: r.tenant_created_at,

        currentLease: r.lease_id
          ? {
              id: r.lease_id,
              status: (r.lease_status || "").toString().toLowerCase(), // 'ACTIVE' -> 'active'
              monthlyRent: r.lease_monthly_rent,
              startDate: r.lease_start_date,
              endDate: r.lease_end_date,
              moveInDate: r.lease_move_in_date,
            }
          : null,

        unit: r.unit_id
          ? {
              id: r.unit_id,
              unitNumber: r.unit_number,
              propertyId: r.unit_property_id,
            }
          : null,
      };
    });

    res.json(out);
  } catch (e: any) {
    console.error("GET /api/tenants:", e?.message);
    res.status(500).json([]);
  }
});

export default router;
