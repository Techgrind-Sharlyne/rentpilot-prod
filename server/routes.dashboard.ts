import { Router } from "express";
import { db } from "./db"; // your existing db client (Drizzle)
import { sql } from "drizzle-orm";

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

// ---------- STATS ----------
router.get("/dashboard/stats", async (_req, res) => {
  const { start, end } = monthWindow();
  try {
    // Total revenue: successful payments this month
    const [revRow]: any = await db.execute(sql`
      SELECT COALESCE(SUM(p.amount),0)::bigint AS total_revenue
      FROM payments p
      WHERE p.status IN ('SUCCESS','PAID','POSTED')
        AND p.paid_at >= ${start} AND p.paid_at < ${end}
    `);

    // Occupied units: distinct units with an ACTIVE lease
    const [occRow]: any = await db.execute(sql`
      SELECT COALESCE(COUNT(DISTINCT l.unit_id),0)::int AS occ
      FROM leases l
      WHERE l.status = 'ACTIVE'
    `);

    // Total units
    const [tuRow]: any = await db.execute(sql`
      SELECT COALESCE(COUNT(*),0)::int AS total_units FROM units
    `);

    // Pending payments this month: sum of invoice amounts due this month that are not fully paid
    // (Uses due_date window only to avoid referencing schema-specific period columns)
    const [pendRow]: any = await db.execute(sql`
      WITH paid AS (
        SELECT invoice_id, COALESCE(SUM(amount),0) AS paid
        FROM payments
        WHERE status IN ('SUCCESS','PAID','POSTED')
        GROUP BY invoice_id
      )
      SELECT COALESCE(SUM(GREATEST(i.amount - COALESCE(p.paid,0),0)),0)::bigint AS pending
      FROM invoices i
      LEFT JOIN paid p ON p.invoice_id = i.id
      WHERE i.due_date >= ${start} AND i.due_date < ${end}
        AND (i.status NOT IN ('PAID','SETTLED') OR (i.amount > COALESCE(p.paid,0)))
    `);

    // Overdue count: invoices past due and not paid
    const [odRow]: any = await db.execute(sql`
      SELECT COALESCE(COUNT(*),0)::int AS overdue
      FROM invoices i
      WHERE i.due_date < now()
        AND i.status NOT IN ('PAID','SETTLED')
    `);

    // Maintenance: if table exists, count; else zero
    const [hasMaint]: any = await db.execute(sql`
      SELECT to_regclass('public.maintenance_requests') IS NOT NULL AS has
    `);
    let maintenanceCount = 0;
    let urgentMaintenanceCount = 0;

    if (hasMaint?.[0]?.has === true || hasMaint?.has === true) {
      const [mc]: any = await db.execute(sql`SELECT COALESCE(COUNT(*),0)::int AS c FROM maintenance_requests`);
      const [umc]: any = await db.execute(sql`
        SELECT COALESCE(COUNT(*),0)::int AS c
        FROM maintenance_requests
        WHERE priority = 'urgent' AND status <> 'completed'
      `);
      maintenanceCount = Number(mc.c ?? mc?.[0]?.c ?? 0);
      urgentMaintenanceCount = Number(umc.c ?? umc?.[0]?.c ?? 0);
    }

    res.json({
      totalRevenue: Number(revRow?.total_revenue ?? revRow?.[0]?.total_revenue ?? 0),
      occupiedUnits: Number(occRow?.occ ?? occRow?.[0]?.occ ?? 0),
      totalUnits: Number(tuRow?.total_units ?? tuRow?.[0]?.total_units ?? 0),
      pendingPayments: Number(pendRow?.pending ?? pendRow?.[0]?.pending ?? 0),
      overdueCount: Number(odRow?.overdue ?? odRow?.[0]?.overdue ?? 0),
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
router.get("/dashboard/recent-payments", async (_req, res) => {
  try {
    const rows: any[] = await db.execute(sql`
      SELECT
        p.id,
        p.amount,
        p.paid_at AS payment_date,
        t.full_name AS tenant_full_name,
        u.code      AS unit_number,
        pr.name     AS property_name
      FROM payments p
      LEFT JOIN invoices i ON i.id = p.invoice_id
      LEFT JOIN leases   l ON l.id = i.lease_id
      LEFT JOIN tenants  t ON t.id = l.tenant_id
      LEFT JOIN units    u ON u.id = l.unit_id
      LEFT JOIN properties pr ON pr.id = u.property_id
      WHERE p.status IN ('SUCCESS','PAID','POSTED')
      ORDER BY p.paid_at DESC
      LIMIT 10
    `);

    const out = rows.map((r) => {
      const name = splitName(r.tenant_full_name ?? null);
      return {
        id: r.id,
        amount: Number(r.amount ?? 0),
        paymentDate: r.payment_date ? new Date(r.payment_date).toISOString() : new Date().toISOString(),
        tenant: name ? { firstName: name.firstName, lastName: name.lastName } : null,
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
router.get("/maintenance-requests", async (_req, res) => {
  try {
    const [hasMaint]: any = await db.execute(sql`
      SELECT to_regclass('public.maintenance_requests') IS NOT NULL AS has
    `);
    if (!(hasMaint?.[0]?.has === true || hasMaint?.has === true)) {
      return res.json([]); // table not present yet
    }

    const rows: any[] = await db.execute(sql`
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

    const out = rows.map((r) => ({
      id: r.id,
      title: r.title,
      priority: r.priority,
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
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
