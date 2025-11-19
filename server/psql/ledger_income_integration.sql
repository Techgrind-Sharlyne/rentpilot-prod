-- Safe UUID helpers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) payments (if yours already exists, this section is safe: only adds cols if missing)
-- You likely have this table; skip CREATE TABLE if present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='payments'
  ) THEN
    EXECUTE $SQL$
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        unit_id uuid,
        invoice_id uuid,
        amount numeric(14,2) NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'pending', -- paid | pending | failed | overdue
        method text,            -- manual | mpesa | bank
        source text,            -- counter | kcb-webhook | import | ...
        tx_id text UNIQUE,
        msisdn text,
        paid_at timestamptz,
        receipt_url text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    $SQL$;
  END IF;
END$$;

-- 2) payment_allocations (FIFO / manual)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_tenant  ON payment_allocations(tenant_id);

-- 3) ledger_adjustments (DEBIT entries to increase arrears)
CREATE TABLE IF NOT EXISTS ledger_adjustments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  unit_id uuid,
  property_id uuid,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_tenant ON ledger_adjustments(tenant_id);

-- 4) util_params_nairobi (month bounds)
CREATE OR REPLACE VIEW util_params_nairobi AS
SELECT
  (date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')) AT TIME ZONE 'Africa/Nairobi') AS month_start,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi') AS now_ky;

-- 5) payments MTD (status='paid')
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

CREATE OR REPLACE VIEW v_payments_mtd AS
WITH params AS ( SELECT month_start FROM util_params_nairobi )
SELECT p.tenant_id, COALESCE(SUM(p.amount),0)::numeric AS amount_paid_mtd
FROM payments p
WHERE lower(p.status)='paid'
  AND (p.paid_at AT TIME ZONE 'Africa/Nairobi') >= (SELECT month_start FROM params)
GROUP BY p.tenant_id;

-- 6) active leases + current month due (simple proration; adjust table/cols if different)
CREATE OR REPLACE VIEW v_active_leases_current_due AS
WITH params AS ( SELECT month_start, now_ky FROM util_params_nairobi )
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
      CEIL(
        (
          ((SELECT now_ky FROM params)::date - l.start_date::date + 1)::numeric
          / EXTRACT(DAY FROM (date_trunc('month', (SELECT now_ky FROM params)) + INTERVAL '1 month - 1 day'))::numeric
        ) * l.monthly_rent
      )::numeric
    ELSE l.monthly_rent::numeric
  END AS current_month_due
FROM leases l
WHERE l.status='active';

-- 7) tenant_debits_view (compose from invoices if you have them + adjustments)
-- For MVP: just adjustments < month_start are arrears_to_date; invoices can be UNIONed later.
CREATE OR REPLACE VIEW tenant_debits_view AS
SELECT
  a.tenant_id,
  a.amount::numeric AS debit_amt,
  a.created_at::date AS charge_date
FROM ledger_adjustments a;

-- 8) arrears to date = historical debits - historical paid (< month_start)
CREATE OR REPLACE VIEW v_tenant_arrears_to_date AS
WITH params AS ( SELECT month_start FROM util_params_nairobi )
SELECT
  t.id AS tenant_id,
  GREATEST(
    COALESCE((
      SELECT SUM(d.debit_amt) FROM tenant_debits_view d
      WHERE d.tenant_id=t.id AND d.charge_date < (SELECT month_start FROM params)
    ),0)
    -
    COALESCE((
      SELECT SUM(p.amount) FROM payments p
      WHERE p.tenant_id=t.id AND lower(p.status)='paid'
        AND (p.paid_at AT TIME ZONE 'Africa/Nairobi') < (SELECT month_start FROM params)
    ),0)
  ,0)::numeric AS arrears_to_date
FROM tenants t;

-- 9) Final finance summary view
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
LEFT JOIN v_active_leases_current_due al ON al.tenant_id=t.id
LEFT JOIN v_payments_mtd pm            ON pm.tenant_id=t.id
LEFT JOIN v_tenant_arrears_to_date a   ON a.tenant_id=t.id;
