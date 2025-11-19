
-- File: psql/create_tenant_finance_views.sql
-- Context: Local staging DB for RentPilot / Atlas Core
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ./psql/create_tenant_finance_views.sql

-- 1) Month bounds helper (Africa/Nairobi)
CREATE OR REPLACE VIEW util_params_nairobi AS
SELECT
  (date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')) AT TIME ZONE 'Africa/Nairobi') AS month_start,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi') AS now_ky;

-- 2) Payments indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

-- 3) Active leases with current month due (simple proration)
CREATE OR REPLACE VIEW v_active_leases_current_due AS
WITH params AS (
  SELECT month_start, now_ky FROM util_params_nairobi
)
SELECT
  l.id               AS lease_id,
  l.tenant_id        AS tenant_id,
  l.monthly_rent     AS monthly_rent,
  l.start_date::date AS start_date,
  l.end_date::date   AS end_date,
  CASE
    WHEN l.status <> 'active'
      OR (l.end_date IS NOT NULL AND l.end_date::date < (SELECT month_start FROM params))
      THEN 0::numeric
    WHEN l.start_date::date > (SELECT month_start FROM params) THEN
      -- Prorate from start_date..end_of_month
      CEIL(
        (
          ( (SELECT now_ky FROM params)::date - l.start_date::date + 1 )::numeric
          / EXTRACT(DAY FROM (date_trunc('month', (SELECT now_ky FROM params)) + INTERVAL '1 month - 1 day'))::numeric
        ) * l.monthly_rent
      )::numeric
    ELSE l.monthly_rent::numeric
  END AS current_month_due
FROM leases l
WHERE l.status = 'active';

-- 4) MTD payments per tenant
CREATE OR REPLACE VIEW v_payments_mtd AS
WITH params AS ( SELECT month_start FROM util_params_nairobi )
SELECT
  p.tenant_id,
  COALESCE(SUM(p.amount),0)::numeric AS amount_paid_mtd
FROM payments p
WHERE LOWER(p.status) = 'paid'
  AND (p.paid_at AT TIME ZONE 'Africa/Nairobi') >= (SELECT month_start FROM params)
GROUP BY p.tenant_id;

-- 5) Arrears to date (carry to end of previous month)
--    Replace tenant_debits_view with posted debits when available.
CREATE OR REPLACE VIEW v_tenant_arrears_to_date AS
WITH params AS ( SELECT month_start FROM util_params_nairobi )
SELECT
  t.id AS tenant_id,
  GREATEST(
    COALESCE((
      SELECT SUM(d.debit_amt) FROM tenant_debits_view d
      WHERE d.tenant_id = t.id
        AND d.charge_date < (SELECT month_start FROM params)
    ), 0)
    -
    COALESCE((
      SELECT SUM(p.amount) FROM payments p
      WHERE p.tenant_id = t.id
        AND LOWER(p.status) = 'paid'
        AND (p.paid_at AT TIME ZONE 'Africa/Nairobi') < (SELECT month_start FROM params)
    ), 0)
  , 0)::numeric AS arrears_to_date
FROM tenants t;

-- Placeholder for tenant_debits_view if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'tenant_debits_view'
  ) THEN
    EXECUTE $v$
      CREATE VIEW tenant_debits_view AS
      SELECT t.id AS tenant_id, 0::numeric AS debit_amt, (CURRENT_DATE - 1)::date AS charge_date
      FROM tenants t
      WHERE false; -- empty placeholder
    $v$;
  END IF;
END$$;

-- 6) Final summary view
CREATE OR REPLACE VIEW v_tenant_finance_summary AS
SELECT
  t.id AS "tenantId",
  COALESCE(pm.amount_paid_mtd, 0)::numeric AS "amountPaidMtd",
  COALESCE(a.arrears_to_date, 0)::numeric AS "arrearsToDate",
  COALESCE(al.current_month_due, 0)::numeric AS "currentMonthDue",
  (COALESCE(a.arrears_to_date,0) + COALESCE(al.current_month_due,0) - COALESCE(pm.amount_paid_mtd,0))::numeric AS "balanceNow",
  CASE
    WHEN (COALESCE(a.arrears_to_date,0) + COALESCE(al.current_month_due,0) - COALESCE(pm.amount_paid_mtd,0)) > 0 THEN 'Overdue'
    WHEN (COALESCE(a.arrears_to_date,0) + COALESCE(al.current_month_due,0) - COALESCE(pm.amount_paid_mtd,0)) < 0 THEN 'Prepaid'
    ELSE 'Cleared'
  END::text AS "status"
FROM tenants t
LEFT JOIN v_active_leases_current_due al ON al.tenant_id = t.id
LEFT JOIN v_payments_mtd pm            ON pm.tenant_id = t.id
LEFT JOIN v_tenant_arrears_to_date a   ON a.tenant_id  = t.id;
