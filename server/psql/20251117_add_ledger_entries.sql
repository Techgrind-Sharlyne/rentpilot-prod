-- server/psql/20251117_add_ledger_entries.sql

BEGIN;

-- 1) Create enum type for ledger entry type (DEBIT = charge, CREDIT = payment)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_entry_type') THEN
        CREATE TYPE ledger_entry_type AS ENUM ('DEBIT', 'CREDIT');
    END IF;
END$$;

-- 2) Create ledger_entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL,
    "date"      date NOT NULL DEFAULT CURRENT_DATE,
    "type"      ledger_entry_type NOT NULL,
    amount      numeric(12,2) NOT NULL CHECK (amount >= 0),
    description text,
    meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT NOW(),
    updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- 3) Foreign key to tenants (assumes tenants.id is uuid pk)
ALTER TABLE ledger_entries
    ADD CONSTRAINT fk_ledger_entries_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

-- 4) Useful indexes
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_date
    ON ledger_entries (tenant_id, "date");

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_type
    ON ledger_entries (tenant_id, "type");

COMMIT;
