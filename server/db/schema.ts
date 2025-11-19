// server/db/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  timestamp,
  date,
  boolean,
  text,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";


// ---------- PROPERTIES ----------
export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------- UNITS ----------
export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id),
  unitNumber: varchar("unit_number", { length: 50 }),
  floor: varchar("floor", { length: 50 }),
  monthlyRent: numeric("monthly_rent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------- TENANTS ----------
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  unitId: uuid("unit_id").references(() => units.id),
  status: varchar("status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------- PAYMENTS ----------
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  unitId: uuid("unit_id").references(() => units.id),
  invoiceId: uuid("invoice_id"),
  amount: numeric("amount"),
  method: varchar("method", { length: 20 }),
  source: varchar("source", { length: 20 }),
  txId: varchar("tx_id", { length: 255 }),
  msisdn: varchar("msisdn", { length: 20 }),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  description: varchar("description", { length: 255 }),
  status: varchar("status", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------- LEDGER (Manual debit/credit) ----------
export const ledger = pgTable("ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  unitId: uuid("unit_id").references(() => units.id),
  amount: numeric("amount"), // always positive
  kind: varchar("kind", { length: 10 }), // 'debit' or 'credit'
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});


// ---------- LEDGER ENTRIES (New single source of truth) ----------

// Enum matches Postgres type: ledger_entry_type ('DEBIT' | 'CREDIT')
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", ["DEBIT", "CREDIT"]);

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  date: date("date").notNull().defaultNow(),
  type: ledgerEntryTypeEnum("type").notNull(), // 'DEBIT' = charge, 'CREDIT' = payment
  amount: numeric("amount").notNull(), // always positive; sign is determined by 'type'
  description: text("description"),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- INVOICES ----------
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  unitId: uuid("unit_id").references(() => units.id),
  amount: numeric("amount"),
  issuedAt: timestamp("issued_at").defaultNow(),
  dueAt: timestamp("due_at"),
  status: varchar("status", { length: 50 }),
});

// ---------- RECEIPTS ----------
export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id"),
  url: varchar("url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});
