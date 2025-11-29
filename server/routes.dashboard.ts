// server/routes.dashboard.ts
import { Router } from "express";
import { db } from "./db"; // Drizzle client
import { sql } from "drizzle-orm";
import { isAuthenticated } from "./auth";

const router = Router();

function monthWindow(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

// Helpers
function splitName(full: string | null): { firstName: string; lastName: string } | null {
  if (!full) return null;
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// Utility: unwrap drizzle execute result into an array of rows
function rowsFrom<T = any>(result: any): T[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as T[];
  if (Array.isArray(result.rows)) return result.rows as T[];
  return [];
}

// ---------- STATS ----------
router.get("/dashboard/stats", isAuthenticated, async (_req, res) => {
  const { start, end } = monthWindow();
  try {
    // Total revenue: successful payments this month
    const revResult = await db.execute(sql`
      SELECT COALESCE(SUM(p.amount),0)::bigint AS total_revenue
      FROM payments p
      WHERE p.paid_at >= ${start} AND p.paid_at < ${end}
    `);
    const revRows = rowsFrom<{ total_revenue: string | number | null }>(revResult);
    const revRow = revRows[0] ?? { total_revenue: 0 };

    // Occupied units: distinct units with an ACTIVE lease
    const occResult = await db.execute(sql`
      SELECT COALESCE(COUNT(DISTINCT l.unit_id),0)::int AS occ
      FROM leases l
      WHERE l.status = 'ACTIVE'
    `);
    const occRows = rowsFrom<{ occ: number | string | null }>(occResult);
    const occRow = occRows[0] ?? { occ: 0 };

    // Total units
    const tuResult = await db.execute(sql`
      SELECT COALESCE(COUNT(*),0)::int AS total_units FROM units
    `);
    const tuRows = rowsFrom<{ total_units: number | string | null }>(tuResult);
    const tuRow = tuRows[0] ?? { total_units: 0 };

    // Pending payments this month: sum of invoice amounts due this month that are not fully paid
    const pendResult = await db.execute(sql`
      WITH paid AS (
        SELECT invoice_id, COALESCE(SUM(amount),0) AS paid
        FROM payments
        GROUP BY invoice_id
      )
      SELECT COALESCE(SUM(GREATEST(i.amount - COALESCE(p.paid,0),0)),0)::bigint AS pending
      FROM invoices i
      LEFT JOIN paid p ON p.invoice_id = i.id
      WHERE i.due_date >= ${start} AND i.due_date < ${end}
        AND (i.status NOT IN ('PAID','SETTLED') OR (i.amount > COALESCE(p.paid,0)))
    `);
    const pendRows = rowsFrom<{ pending: string | number | null }>(pendResult);
    const pendRow = pendRows[0] ?? { pending: 0 };

    // Overdue count: invoices past due and not paid
    const odResult = await db.execute(sql`
      SELECT COALESCE(COUNT(*),0)::int AS overdue
      FROM invoices i
      WHERE i.due_date < now()
        AND i.status NOT IN ('PAID','SETTLED')
    `);
    const odRows = rowsFrom<{ overdue: number | string | null }>(odResult);
    const odRow = odRows[0] ?? { overdue: 0 };

    // Maintenance: if table exists, count; else zero
    const hasMaintResult = await db.execute(sql`
      SELECT to_regclass('public.maintenance_requests') IS NOT NULL AS has
    `);
    const hasMaintRows = rowsFrom<{ has: boolean }>(hasMaintResult);
    const hasMaint = !!(hasMaintRows[0]?.has);

    let maintenanceCount = 0;
    let urgentMaintenanceCount = 0;

    if (hasMaint) {
      const mcResult = await db.execute(sql`
        SELECT COALESCE(COUNT(*),0)::int AS c FROM maintenance_requests
      `);
      const mcRows = rowsFrom<{ c: number | string | null }>(mcResult);
      const mcRow = mcRows[0] ?? { c: 0 };

      const umcResult = await db.execute(sql`
        SELECT COALESCE(COUNT(*),0)::int AS c
        FROM maintenance_requests
        WHERE priority = 'urgent' AND status <> 'completed'
      `);
      const umcRows = rowsFrom<{ c: number | string | null }>(umcResult);
      const umcRow = umcRows[0] ?? { c: 0 };

      maintenanceCount = Number(mcRow.c ?? 0);
      urgentMaintenanceCount = Number(umcRow.c ?? 0);
    }

    res.json({
      totalRevenue: Number(revRow.total_revenue ?? 0),
      occupiedUnits: Number(occRow.occ ?? 0),
      totalUnits: Number(tuRow.total_units ?? 0),
      pendingPayments: Number(pendRow.pending ?? 0),
      overdueCount: Number(odRow.overdue ?? 0),
      maintenanceCount,
      urgentMaintenanceCount,
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    res.status(500).json({
      totalRevenue: 0,
      occupiedUnits: 0,
      totalUnits: 0,
      pendingPayments: 0,
      overdueCount: 0,
      maintenanceCount: 0,
      urgentMaintenanceCount: 0,
      _error: "stats_failed",
    });
  }
});

// ---------- RECENT PAYMENTS ----------
// Use the SAME data path as Rent Income: payments + tenants + units + properties.
router.get("/dashboard/recent-payments", isAuthenticated, async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id,
        p.amount,
        p.paid_at                     AS payment_date,
        t.full_name                   AS tenant_full_name,
        u.code                        AS unit_number,
        pr.name                       AS property_name
      FROM payments p
      LEFT JOIN tenants    t  ON t.id = p.tenant_id
      LEFT JOIN units      u  ON u.id = p.unit_id
      LEFT JOIN properties pr ON pr.id = u.property_id
      ORDER BY p.paid_at DESC NULLS LAST
      LIMIT 10
    `);

    const rows = rowsFrom<any>(result);

    const out = rows.map((r) => {
      const name = splitName(r.tenant_full_name ?? null);
      return {
        id: r.id,
        amount: Number(r.amount ?? 0),
        paymentDate: r.payment_date
          ? new Date(r.payment_date).toISOString()
          : new Date().toISOString(),
        tenant: name
          ? { firstName: name.firstName, lastName: name.lastName }
          : null,
        unit: r.unit_number ? { unitNumber: r.unit_number } : null,
        property: r.property_name ? { name: r.property_name } : null,
      };
    });

    res.json(out);
  } catch (err) {
    console.error("GET /api/dashboard/recent-payments error:", err);
    res.json([]); // keep UI happy
  }
});

// ---------- MAINTENANCE REQUESTS ----------
router.get("/maintenance-requests", isAuthenticated, async (_req, res) => {
  try {
    const hasMaintResult = await db.execute(sql`
      SELECT to_regclass('public.maintenance_requests') IS NOT NULL AS has
    `);
    const hasMaintRows = rowsFrom<{ has: boolean }>(hasMaintResult);
    const hasMaint = !!(hasMaintRows[0]?.has);

    if (!hasMaint) {
      return res.json([]); // table not present yet
    }

    const result = await db.execute(sql`
      SELECT
        m.id,
        m.title,
        m.priority,              -- 'urgent' | 'high' | 'normal' | 'low'
        m.status,                -- 'open' | 'in_progress' | 'completed'
        m.created_at,
        u.code    AS unit_number,
        pr.name   AS property_name
      FROM maintenance_requests m
      LEFT JOIN units u ON u.id = m.unit_id
      LEFT JOIN properties pr ON pr.id = u.property_id
      ORDER BY m.created_at DESC
      LIMIT 10
    `);

    const rows = rowsFrom<any>(result);

    const out = rows.map((r) => ({
      id: r.id,
      title: r.title,
      priority: r.priority,
      status: r.status,
      createdAt: r.created_at
        ? new Date(r.created_at).toISOString()
        : new Date().toISOString(),
      unit: r.unit_number ? { unitNumber: r.unit_number } : null,
      property: r.property_name ? { name: r.property_name } : null,
    }));

    res.json(out);
  } catch (err) {
    console.error("GET /api/maintenance-requests error:", err);
    res.json([]); // keep UI happy
  }
});

export default router;
