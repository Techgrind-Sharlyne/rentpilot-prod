import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  timestamp, 
  decimal, 
  integer, 
  boolean,
  pgEnum,
  uuid,
  jsonb,
  index,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "landlord", "property_manager", "agent", "tenant"]);
export const propertyTypeEnum = pgEnum("property_type", ["apartment_complex", "single_family", "duplex", "commercial", "townhouse", "bedsitter", "maisonette"]);
export const propertyStatusEnum = pgEnum("property_status", ["active", "inactive", "maintenance"]);
export const unitStatusEnum = pgEnum("unit_status", ["vacant", "occupied", "maintenance", "reserved", "under_renovation"]);
export const leaseStatusEnum = pgEnum("lease_status", ["active", "expired", "terminated", "pending"]);
export const paymentStatusEnum = pgEnum("payment_status", ["paid", "pending", "overdue", "failed"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "check", "bank_transfer", "credit_card", "mpesa", "online"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", ["open", "in_progress", "completed", "cancelled"]);
export const maintenancePriorityEnum = pgEnum("maintenance_priority", ["low", "normal", "high", "urgent"]);
export const maintenanceCategoryEnum = pgEnum("maintenance_category", ["plumbing", "electrical", "hvac", "appliance", "structural", "other"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled", "unpaid", "partial"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected"]);

// New enums for enterprise features
export const mpesaTypeEnum = pgEnum("mpesa_type", ["paybill", "till_number"]);
export const penaltyTypeEnum = pgEnum("penalty_type", ["fixed_amount", "percentage_of_rent", "percentage_of_balance"]);
export const recurringFeeTypeEnum = pgEnum("recurring_fee_type", ["garbage", "parking", "security", "internet", "service_fee", "water", "other"]);
export const managementFeeTypeEnum = pgEnum("management_fee_type", ["fixed_amount", "percentage_of_rent"]);
export const depositTypeEnum = pgEnum("deposit_type", ["rent_deposit", "water_deposit", "electricity_deposit", "security_deposit", "other"]);
export const auditActionEnum = pgEnum("audit_action", ["CREATE", "UPDATE", "DELETE", "SOFT_DELETE", "RESTORE"]);

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [
    index("IDX_session_expire").on(table.expire),
    index("IDX_session_sid").on(table.sid)
  ],
);

// Idempotency keys table for payment simulation
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_idempotency_key").on(table.key),
  index("IDX_idempotency_created_at").on(table.createdAt),
]);

// Users table - Enhanced with tenant details
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: userRoleEnum("role").notNull().default("tenant"),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").default(true),
  isApproved: boolean("is_approved").default(false),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  // Enhanced tenant details
  nationalId: varchar("national_id", { length: 50 }),
  kraPin: varchar("kra_pin", { length: 20 }),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 200 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  
  // Soft delete fields
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for common queries
  index("IDX_users_email").on(table.email),
  index("IDX_users_role").on(table.role),
  index("IDX_users_phone").on(table.phone),
  index("IDX_users_active_status").on(table.isActive, table.isApproved),
  index("IDX_users_national_id").on(table.nationalId),
  index("IDX_users_created_at").on(table.createdAt),
  index("IDX_users_deleted").on(table.isDeleted),
  // Composite index for common search patterns
  index("IDX_users_name_search").on(table.firstName, table.lastName),
]);

// User access requests table for onboarding workflow
export const userAccessRequests = pgTable("user_access_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  requestedRole: userRoleEnum("requested_role").notNull(),
  reason: text("reason"),
  status: requestStatusEnum("status").default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_user_requests_email").on(table.email),
  index("IDX_user_requests_status").on(table.status),
  index("IDX_user_requests_created_at").on(table.createdAt),
]);

// Audit Log Table - Track all system changes and deletions
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 255 }).notNull(),
  action: auditActionEnum("action").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  userId: uuid("user_id").references(() => users.id),
  userEmail: varchar("user_email", { length: 255 }),
  userRole: varchar("user_role", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("IDX_audit_log_table_record").on(table.tableName, table.recordId),
  index("IDX_audit_log_user").on(table.userId),
  index("IDX_audit_log_action").on(table.action),
  index("IDX_audit_log_timestamp").on(table.timestamp),
]);

// Properties table - Enhanced for enterprise features
export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: propertyTypeEnum("type").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }),
  description: text("description"),
  totalUnits: integer("total_units").notNull().default(0),
  status: propertyStatusEnum("status").default("active"),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
  purchaseDate: timestamp("purchase_date"),
  ownerId: uuid("owner_id").references(() => users.id),
  managerId: uuid("manager_id").references(() => users.id),
  
  // Enterprise features - Utility rates
  waterRate: decimal("water_rate", { precision: 10, scale: 2 }),
  electricityRate: decimal("electricity_rate", { precision: 10, scale: 2 }),
  
  // M-Pesa configuration
  mpesaType: mpesaTypeEnum("mpesa_type"),
  mpesaPaybillNumber: varchar("mpesa_paybill_number", { length: 20 }),
  mpesaAccountNumber: varchar("mpesa_account_number", { length: 50 }),
  mpesaStoreNumber: varchar("mpesa_store_number", { length: 20 }),
  mpesaTillNumber: varchar("mpesa_till_number", { length: 20 }),
  
  // Rent penalty configuration
  rentPenaltyType: penaltyTypeEnum("rent_penalty_type"),
  rentPenaltyAmount: decimal("rent_penalty_amount", { precision: 10, scale: 2 }),
  
  // Tax configuration
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('7.5'),
  
  // Management fee configuration
  managementFeeType: managementFeeTypeEnum("management_fee_type"),
  managementFeeAmount: decimal("management_fee_amount", { precision: 10, scale: 2 }),
  
  // Soft delete fields
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for property queries
  index("IDX_properties_owner").on(table.ownerId),
  index("IDX_properties_manager").on(table.managerId),
  index("IDX_properties_status").on(table.status),
  index("IDX_properties_type").on(table.type),
  index("IDX_properties_city_state").on(table.city, table.state),
  index("IDX_properties_created_at").on(table.createdAt),
  // Full-text search support
  index("IDX_properties_name_search").on(table.name),
  // Unique constraint to prevent duplicate properties
  unique("unique_property_name_address").on(table.name, table.address),
]);

// Units table - Enhanced for enterprise features
export const units = pgTable("units", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitNumber: varchar("unit_number", { length: 50 }).notNull(),
  bedrooms: integer("bedrooms").default(0),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).default('0'),
  squareFeet: integer("square_feet"),
  unitSize: varchar("unit_size", { length: 50 }), // e.g., "1BR", "2BR", "Studio"
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  status: unitStatusEnum("status").default("vacant"),
  description: text("description"),
  
  // Unit-specific tax rate (overrides property tax rate if set)
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),
  
  // Soft delete fields
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for unit queries
  index("IDX_units_property").on(table.propertyId),
  index("IDX_units_status").on(table.status),
  index("IDX_units_rent_range").on(table.monthlyRent),
  index("IDX_units_bedrooms").on(table.bedrooms),
  index("IDX_units_property_status").on(table.propertyId, table.status),
  index("IDX_units_unit_number").on(table.unitNumber),
  // Unique constraint to prevent duplicate unit numbers within same property
  unique("unique_property_unit_number").on(table.propertyId, table.unitNumber),
]);

// Leases table - Enhanced with move in/out dates
export const leases = pgTable("leases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  moveInDate: timestamp("move_in_date").notNull(),
  moveOutDate: timestamp("move_out_date"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  status: leaseStatusEnum("status").default("pending"),
  terms: text("terms"),
  
  // Tenant move-out notice
  moveOutNoticeDate: timestamp("move_out_notice_date"),
  moveOutReason: text("move_out_reason"),
  
  // Soft delete fields
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for lease queries
  index("IDX_leases_unit").on(table.unitId),
  index("IDX_leases_tenant").on(table.tenantId),
  index("IDX_leases_status").on(table.status),
  index("IDX_leases_dates").on(table.startDate, table.endDate),
  index("IDX_leases_move_in").on(table.moveInDate),
  index("IDX_leases_active_leases").on(table.status, table.startDate, table.endDate),
  // Composite index for current tenant lookup
  index("IDX_leases_current_tenant").on(table.unitId, table.status, table.startDate),
]);

// Payments table
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  leaseId: uuid("lease_id").references(() => leases.id, { onDelete: "set null" }),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }), // For payment simulation
  unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "restrict" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  description: text("description"),
  transactionId: varchar("transaction_id", { length: 255 }),
  txId: varchar("tx_id", { length: 100 }).unique(), // For payment simulation
  notes: text("notes"),
  // M-Pesa specific fields
  mpesaPhoneNumber: varchar("mpesa_phone_number", { length: 15 }),
  mpesaCheckoutRequestId: varchar("mpesa_checkout_request_id", { length: 100 }),
  mpesaTransactionId: varchar("mpesa_transaction_id", { length: 50 }),
  mpesaReceiptNumber: varchar("mpesa_receipt_number", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Critical indexes for payment processing
  index("IDX_payments_tenant").on(table.tenantId),
  index("IDX_payments_unit").on(table.unitId),
  index("IDX_payments_status").on(table.status),
  index("IDX_payments_due_date").on(table.dueDate),
  index("IDX_payments_payment_date").on(table.paymentDate),
  index("IDX_payments_method").on(table.paymentMethod),
  index("IDX_payments_transaction_id").on(table.transactionId),
  // Composite indexes for common queries
  index("IDX_payments_tenant_status").on(table.tenantId, table.status),
  index("IDX_payments_overdue").on(table.dueDate, table.status),
  index("IDX_payments_mpesa_checkout").on(table.mpesaCheckoutRequestId),
  index("IDX_payments_mpesa_transaction").on(table.mpesaTransactionId),
  // Monthly revenue reporting
  index("IDX_payments_monthly_revenue").on(table.paymentDate, table.status, table.amount),
]);

// Invoices table
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => users.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default('0'),
  periodMonth: integer("period_month").notNull(), // 1-12
  periodYear: integer("period_year").notNull(), // e.g., 2025
  dueDate: timestamp("due_date").notNull(),
  status: invoiceStatusEnum("status").default("draft"),
  description: text("description").notNull(),
  itemsJson: text("items_json"), // JSON array of invoice items
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Add indexes for payment simulation queries
  index("IDX_invoices_tenant_period").on(table.tenantId, table.periodYear, table.periodMonth),
  index("IDX_invoices_status").on(table.status),
  index("IDX_invoices_unpaid").on(table.status, table.dueDate),
]);

// Maintenance Requests table
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: maintenanceCategoryEnum("category").notNull(),
  priority: maintenancePriorityEnum("priority").default("normal"),
  status: maintenanceStatusEnum("status").default("open"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for maintenance queries
  index("IDX_maintenance_unit").on(table.unitId),
  index("IDX_maintenance_tenant").on(table.tenantId),
  index("IDX_maintenance_status").on(table.status),
  index("IDX_maintenance_category").on(table.category),
  index("IDX_maintenance_priority").on(table.priority),
  index("IDX_maintenance_assigned").on(table.assignedTo),
  index("IDX_maintenance_created_at").on(table.createdAt),
  // Composite indexes for common queries
  index("IDX_maintenance_status_priority").on(table.status, table.priority),
  index("IDX_maintenance_unit_status").on(table.unitId, table.status),
]);

// Property recurring fees table
export const propertyRecurringFees = pgTable("property_recurring_fees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  feeType: recurringFeeTypeEnum("fee_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: varchar("description", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Unit recurring fees table (inherits from property but can be overridden)
export const unitRecurringFees = pgTable("unit_recurring_fees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  feeType: recurringFeeTypeEnum("fee_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: varchar("description", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenditure category enum
export const expenditureCategoryEnum = pgEnum("expenditure_category", ["caretaker", "security", "maintenance", "utilities", "management", "other"]);
export const recurringPeriodEnum = pgEnum("recurring_period", ["monthly", "quarterly", "yearly"]);

// Expenditures table for tracking property expenses
export const expenditures = pgTable("expenditures", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id), // Optional - for property-specific expenses
  category: expenditureCategoryEnum("category").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  recurring: boolean("recurring").default(false),
  recurringPeriod: recurringPeriodEnum("recurring_period"),
  nextDueDate: timestamp("next_due_date"),
  
  // Soft delete fields
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_expenditures_property").on(table.propertyId),
  index("IDX_expenditures_category").on(table.category),
  index("IDX_expenditures_payment_date").on(table.paymentDate),
  index("IDX_expenditures_recurring").on(table.recurring),
  index("IDX_expenditures_next_due").on(table.nextDueDate),
]);

// Tenant deposits table (supports multiple deposit types)
export const tenantDeposits = pgTable("tenant_deposits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => users.id),
  leaseId: uuid("lease_id").notNull().references(() => leases.id),
  depositType: depositTypeEnum("deposit_type").notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  amountReturned: decimal("amount_returned", { precision: 10, scale: 2 }).default('0'),
  returnDate: timestamp("return_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant documents table (for file uploads)
export const tenantDocuments = pgTable("tenant_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => users.id),
  documentType: varchar("document_type", { length: 100 }).notNull(), // "id_copy", "lease_agreement", "profile_photo", etc.
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tenant gadgets/items table (for checkout tracking)
export const tenantGadgets = pgTable("tenant_gadgets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => users.id),
  leaseId: uuid("lease_id").notNull().references(() => leases.id),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  description: text("description"),
  serialNumber: varchar("serial_number", { length: 100 }),
  condition: varchar("condition", { length: 100 }), // "new", "good", "fair", "poor"
  isReturned: boolean("is_returned").default(false),
  returnDate: timestamp("return_date"),
  returnCondition: varchar("return_condition", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  ownedProperties: many(properties, { relationName: "property_owner" }),
  managedProperties: many(properties, { relationName: "property_manager" }),
  leases: many(leases),
  payments: many(payments),
  invoices: many(invoices),
  maintenanceRequests: many(maintenanceRequests),
  deposits: many(tenantDeposits),
  documents: many(tenantDocuments),
  gadgets: many(tenantGadgets),
}));

export const propertiesRelations = relations(properties, ({ many, one }) => ({
  owner: one(users, { 
    fields: [properties.ownerId], 
    references: [users.id],
    relationName: "property_owner"
  }),
  manager: one(users, { 
    fields: [properties.managerId], 
    references: [users.id],
    relationName: "property_manager"
  }),
  units: many(units),
  recurringFees: many(propertyRecurringFees),
}));

export const unitsRelations = relations(units, ({ many, one }) => ({
  property: one(properties, {
    fields: [units.propertyId],
    references: [properties.id],
  }),
  leases: many(leases),
  payments: many(payments),
  invoices: many(invoices),
  maintenanceRequests: many(maintenanceRequests),
  recurringFees: many(unitRecurringFees),
}));

export const leasesRelations = relations(leases, ({ one, many }) => ({
  unit: one(units, {
    fields: [leases.unitId],
    references: [units.id],
  }),
  tenant: one(users, {
    fields: [leases.tenantId],
    references: [users.id],
  }),
  payments: many(payments),
  deposits: many(tenantDeposits),
  gadgets: many(tenantGadgets),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(users, {
    fields: [payments.tenantId],
    references: [users.id],
  }),
  lease: one(leases, {
    fields: [payments.leaseId],
    references: [leases.id],
  }),
  unit: one(units, {
    fields: [payments.unitId],
    references: [units.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(users, {
    fields: [invoices.tenantId],
    references: [users.id],
  }),
  unit: one(units, {
    fields: [invoices.unitId],
    references: [units.id],
  }),
  payments: many(payments),
}));

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one }) => ({
  unit: one(units, {
    fields: [maintenanceRequests.unitId],
    references: [units.id],
  }),
  tenant: one(users, {
    fields: [maintenanceRequests.tenantId],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [maintenanceRequests.assignedTo],
    references: [users.id],
  }),
}));

// New table relations
export const propertyRecurringFeesRelations = relations(propertyRecurringFees, ({ one }) => ({
  property: one(properties, {
    fields: [propertyRecurringFees.propertyId],
    references: [properties.id],
  }),
}));

export const unitRecurringFeesRelations = relations(unitRecurringFees, ({ one }) => ({
  unit: one(units, {
    fields: [unitRecurringFees.unitId],
    references: [units.id],
  }),
}));

export const tenantDepositsRelations = relations(tenantDeposits, ({ one }) => ({
  tenant: one(users, {
    fields: [tenantDeposits.tenantId],
    references: [users.id],
  }),
  lease: one(leases, {
    fields: [tenantDeposits.leaseId],
    references: [leases.id],
  }),
}));

export const tenantDocumentsRelations = relations(tenantDocuments, ({ one }) => ({
  tenant: one(users, {
    fields: [tenantDocuments.tenantId],
    references: [users.id],
  }),
  uploadedBy: one(users, {
    fields: [tenantDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const tenantGadgetsRelations = relations(tenantGadgets, ({ one }) => ({
  tenant: one(users, {
    fields: [tenantGadgets.tenantId],
    references: [users.id],
  }),
  lease: one(leases, {
    fields: [tenantGadgets.leaseId],
    references: [leases.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAccessRequestSchema = createInsertSchema(userAccessRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Fix decimal field validation to accept numbers
  waterRate: z.coerce.number().optional(),
  electricityRate: z.coerce.number().optional(),
  rentPenaltyAmount: z.coerce.number().optional(),
  taxRate: z.coerce.number().optional(),
  managementFeeAmount: z.coerce.number().optional(),
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Fix decimal field validation to accept numbers
  bathrooms: z.coerce.number().optional(),
  monthlyRent: z.coerce.number().min(0, "Monthly rent must be positive"),
  securityDeposit: z.coerce.number().optional(),
  taxRate: z.coerce.number().optional(),
});

export const insertLeaseSchema = createInsertSchema(leases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Fix decimal field validation to accept numbers
  monthlyRent: z.coerce.number().min(0, "Monthly rent must be positive"),
  securityDeposit: z.coerce.number().optional(),
  // Fix date field validation to accept strings and convert to dates
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  moveInDate: z.string().transform((str) => new Date(str)),
  moveOutDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Fix decimal field validation to accept numbers
  amount: z.coerce.number().min(0, "Payment amount must be positive"),
  penaltyAmount: z.coerce.number().optional(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Fix decimal field validation to accept numbers
  amount: z.coerce.number().min(0, "Amount must be positive"),
  amountDue: z.coerce.number().min(0, "Amount due must be positive"),
  amountPaid: z.coerce.number().min(0, "Amount paid must be positive").optional(),
});

export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertPropertyRecurringFeeSchema = createInsertSchema(propertyRecurringFees).omit({
  id: true,
  createdAt: true,
});

export const insertUnitRecurringFeeSchema = createInsertSchema(unitRecurringFees).omit({
  id: true,
  createdAt: true,
});

export const insertTenantDepositSchema = createInsertSchema(tenantDeposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertTenantGadgetSchema = createInsertSchema(tenantGadgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  timestamp: true,
});

export const insertExpenditureSchema = createInsertSchema(expenditures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const insertIdempotencyKeySchema = createInsertSchema(idempotencyKeys).omit({
  id: true,
  createdAt: true,
});

// Select Types
export type User = typeof users.$inferSelect;
export type UserAccessRequest = typeof userAccessRequests.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Lease = typeof leases.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type PropertyRecurringFee = typeof propertyRecurringFees.$inferSelect;
export type UnitRecurringFee = typeof unitRecurringFees.$inferSelect;
export type TenantDeposit = typeof tenantDeposits.$inferSelect;
export type TenantDocument = typeof tenantDocuments.$inferSelect;
export type TenantGadget = typeof tenantGadgets.$inferSelect;
export type Expenditure = typeof expenditures.$inferSelect;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;

// Insert Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUserAccessRequest = z.infer<typeof insertUserAccessRequestSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type InsertPropertyRecurringFee = z.infer<typeof insertPropertyRecurringFeeSchema>;
export type InsertUnitRecurringFee = z.infer<typeof insertUnitRecurringFeeSchema>;
export type InsertTenantDeposit = z.infer<typeof insertTenantDepositSchema>;
export type InsertTenantDocument = z.infer<typeof insertTenantDocumentSchema>;
export type InsertTenantGadget = z.infer<typeof insertTenantGadgetSchema>;
export type InsertExpenditure = z.infer<typeof insertExpenditureSchema>;
export type InsertIdempotencyKey = z.infer<typeof insertIdempotencyKeySchema>;

// Extended types with relations
export type PropertyWithDetails = Property & {
  units?: Unit[];
  owner?: User;
  manager?: User;
  occupiedUnits?: number;
  monthlyRevenue?: number;
  occupancyRate?: number;
  recurringFees?: PropertyRecurringFee[];
};

export type UnitWithDetails = Unit & {
  property?: Property;
  currentLease?: Lease;
  tenant?: User;
  recurringFees?: UnitRecurringFee[];
};

export type TenantWithDetails = User & {
  currentLease?: Lease;
  unit?: Unit;
  property?: Property;
  lastPayment?: Payment;
  deposits?: TenantDeposit[];
  documents?: TenantDocument[];
  gadgets?: TenantGadget[];
};

export type PaymentWithDetails = Payment & {
  tenant?: User;
  unit?: Unit;
  property?: Property;
};

export type MaintenanceRequestWithDetails = MaintenanceRequest & {
  unit?: Unit;
  property?: Property;
  tenant?: User;
  assignee?: User;
};

export type LeaseWithDetails = Lease & {
  unit?: UnitWithDetails;
  tenant?: TenantWithDetails;
  deposits?: TenantDeposit[];
  gadgets?: TenantGadget[];
};
