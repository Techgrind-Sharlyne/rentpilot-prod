// server/storage.ts
import {
  users,
  userAccessRequests,
  properties,
  units,
  leases,
  payments,
  invoices,
  maintenanceRequests,
  propertyRecurringFees,
  unitRecurringFees,
  tenantDeposits,
  tenantDocuments,
  tenantGadgets,
  expenditures,
  type User,
  type UserAccessRequest,
  type Property,
  type Unit,
  type Lease,
  type Payment,
  type Invoice,
  type MaintenanceRequest,
  type PropertyRecurringFee,
  type UnitRecurringFee,
  type TenantDeposit,
  type TenantDocument,
  type TenantGadget,
  type InsertUser,
  type InsertUserAccessRequest,
  type InsertProperty,
  type InsertUnit,
  type InsertLease,
  type InsertPayment,
  type InsertInvoice,
  type InsertMaintenanceRequest,
  type InsertPropertyRecurringFee,
  type InsertUnitRecurringFee,
  type InsertTenantDeposit,
  type InsertTenantDocument,
  type InsertTenantGadget,
  type Expenditure,
  type InsertExpenditure,
  type PropertyWithDetails,
  type UnitWithDetails,
  type TenantWithDetails,
  type PaymentWithDetails,
  type MaintenanceRequestWithDetails,
  type LeaseWithDetails,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, sum, or, inArray } from "drizzle-orm";

// --- MPesa/Paybill matching helpers -----------------------------------------

/** Normalize Kenyan MSISDN to 12-digit 2547XXXXXXXX */
function normalizeMsisdn(input?: string | null): string | null {
  if (!input) return null;
  let s = String(input).trim().replace(/[^\d]/g, "");
  if (s.startsWith("0") && s.length === 10) s = "254" + s.slice(1);   // 07XXXXXXXX -> 2547XXXXXXXX
  if (s.startsWith("7") && s.length === 9) s = "254" + s;             // 7XXXXXXXX  -> 2547XXXXXXXX
  if (s.startsWith("254") && s.length === 12) return s;               // already normalized
  return s.length >= 12 ? s.slice(0, 12) : s;                         // best-effort clamp
}

/** Uppercase + strip non-alphanumerics. " B-12 " -> "B12" */
function normalizeRef(ref?: string | null): string | null {
  if (!ref) return null;
  const up = ref.toUpperCase().trim();
  return up.replace(/[^A-Z0-9]+/g, "");
}

/**
 * Parse bank-style refs e.g. "ACCT123#B-12".
 * Returns { fullRef, unitToken } where unitToken is the part after '#', normalized.
 * If no '#', unitToken === normalized(fullRef).
 */
function parseAccountReference(ref?: string | null): { fullRef: string | null; unitToken: string | null } {
  if (!ref) return { fullRef: null, unitToken: null };
  const raw = String(ref).trim();
  const parts = raw.split("#");
  const fullRef = normalizeRef(parts[0]);
  const unitToken = normalizeRef(parts[1] ?? parts[0]); // prefer #part; else whole
  return { fullRef, unitToken };
}
// ---------------------------------------------------------------------------

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Access request operations
  getAccessRequest(id: string): Promise<UserAccessRequest | undefined>;
  getAccessRequestByEmail(email: string): Promise<UserAccessRequest | undefined>;
  getPendingAccessRequests(): Promise<UserAccessRequest[]>;
  createAccessRequest(request: InsertUserAccessRequest): Promise<UserAccessRequest>;
  updateAccessRequest(id: string, request: Partial<InsertUserAccessRequest>): Promise<UserAccessRequest>;
  
  // Property operations
  getProperties(): Promise<PropertyWithDetails[]>;
  getProperty(id: string): Promise<PropertyWithDetails | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  
  // Unit operations
  getUnits(propertyId?: string): Promise<UnitWithDetails[]>;
  getUnit(id: string): Promise<UnitWithDetails | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: string, unit: Partial<InsertUnit>): Promise<Unit>;
  deleteUnit(id: string): Promise<void>;
  
  // Tenant operations
  getTenants(): Promise<TenantWithDetails[]>;
  getTenant(id: string): Promise<TenantWithDetails | undefined>;
  
  // Lease operations
  getLeases(): Promise<Lease[]>;
  getLease(id: string): Promise<Lease | undefined>;
  createLease(lease: InsertLease): Promise<Lease>;
  updateLease(id: string, lease: Partial<InsertLease>): Promise<Lease>;
  deleteLease(id: string): Promise<void>;
  getActiveLeaseByUnit(unitId: string): Promise<Lease | undefined>;
  
  // Payment operations
  getPayments(): Promise<PaymentWithDetails[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentById(id: string): Promise<Payment | undefined>;
  getPaymentByCheckoutRequestId(checkoutRequestId: string): Promise<Payment | undefined>;
  getPaymentsByTenant(tenantId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: string): Promise<void>;
  getRecentPayments(limit?: number): Promise<PaymentWithDetails[]>;
  
  // Invoice operations
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getTenantInvoices(tenantId: string, status?: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  
  // Maintenance operations
  getMaintenanceRequests(): Promise<MaintenanceRequestWithDetails[]>;
  getMaintenanceRequest(id: string): Promise<MaintenanceRequest | undefined>;
  createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(id: string, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest>;
  deleteMaintenanceRequest(id: string): Promise<void>;
  
  // Expenditure operations
  getExpenditures(propertyId?: string, category?: string): Promise<Expenditure[]>;
  getExpenditure(id: string): Promise<Expenditure | undefined>;
  createExpenditure(expenditure: InsertExpenditure): Promise<Expenditure>;
  updateExpenditure(id: string, expenditure: Partial<InsertExpenditure>): Promise<Expenditure>;
  deleteExpenditure(id: string): Promise<void>;
  
  // Payment status tracking
  getTenantPaymentStatus(tenantId: string): Promise<{
    totalPaid: number;
    totalDue: number;
    overdueAmount: number;
    lastPaymentDate?: Date;
    rentStatus: 'current' | 'overdue' | 'partial';
  }>;
  
  getArrearsForTenant(tenantId: string): Promise<number>;
  
  getClearedRentStatus(): Promise<Array<{
    tenantId: string;
    tenantName: string;
    unitNumber: string;
    propertyName: string;
    monthlyRent: number;
    lastPaymentDate?: Date;
    amountPaid: number;
    arrearsAmount: number;
    status: 'cleared' | 'partial' | 'overdue';
  }>>;
  
  getOverduePayments(): Promise<PaymentWithDetails[]>;
  
  createPaybillPayment(paymentData: {
    tenantId: string;
    unitId: string;
    amount: number;
    phoneNumber: string;
    transactionId: string;
    accountReference: string;
  }): Promise<Payment>;
  
  findTenantByPhoneOrReference(phoneNumber: string, accountReference: string): Promise<{
    tenant: User;
    unit: Unit;
    lease: Lease;
  } | null>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalRevenue: number;
    occupiedUnits: number;
    totalUnits: number;
    pendingPayments: number;
    overdueCount: number;
    maintenanceCount: number;
    urgentMaintenanceCount: number;
  }>;
  
  // Enterprise features - Property recurring fees
  getPropertyRecurringFees(propertyId: string): Promise<PropertyRecurringFee[]>;
  createPropertyRecurringFee(fee: InsertPropertyRecurringFee): Promise<PropertyRecurringFee>;
  updatePropertyRecurringFee(id: string, fee: Partial<InsertPropertyRecurringFee>): Promise<PropertyRecurringFee>;
  deletePropertyRecurringFee(id: string): Promise<void>;
  
  // Enterprise features - Unit recurring fees
  getUnitRecurringFees(unitId: string): Promise<UnitRecurringFee[]>;
  createUnitRecurringFee(fee: InsertUnitRecurringFee): Promise<UnitRecurringFee>;
  updateUnitRecurringFee(id: string, fee: Partial<InsertUnitRecurringFee>): Promise<UnitRecurringFee>;
  deleteUnitRecurringFee(id: string): Promise<void>;
  
  // Enterprise features - Tenant deposits
  getTenantDeposits(tenantId: string): Promise<TenantDeposit[]>;
  createTenantDeposit(deposit: InsertTenantDeposit): Promise<TenantDeposit>;
  updateTenantDeposit(id: string, deposit: Partial<InsertTenantDeposit>): Promise<TenantDeposit>;
  deleteTenantDeposit(id: string): Promise<void>;
  
  // Enterprise features - Tenant documents
  getTenantDocuments(tenantId: string): Promise<TenantDocument[]>;
  createTenantDocument(document: InsertTenantDocument): Promise<TenantDocument>;
  deleteTenantDocument(id: string): Promise<void>;
  
  // Enterprise features - Tenant gadgets
  getTenantGadgets(tenantId: string): Promise<TenantGadget[]>;
  createTenantGadget(gadget: InsertTenantGadget): Promise<TenantGadget>;
  updateTenantGadget(id: string, gadget: Partial<InsertTenantGadget>): Promise<TenantGadget>;
  deleteTenantGadget(id: string): Promise<void>;

  // Analytics mentioned in routes.ts
  getExpenditureAnalytics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail)));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // Get active leases to update unit statuses
    const activeLeases = await db
      .select({ unitId: leases.unitId })
      .from(leases)
      .where(and(eq(leases.tenantId, id), eq(leases.status, 'active')));
    
    // Terminate active leases and free up units
    if (activeLeases.length > 0) {
      await db
        .update(leases)
        .set({ status: 'terminated', endDate: new Date(), updatedAt: new Date() })
        .where(and(eq(leases.tenantId, id), eq(leases.status, 'active')));
      
      // Update unit statuses to vacant
      const unitIds = activeLeases.map(lease => lease.unitId);
      if (unitIds.length > 0) {
        await db
          .update(units)
          .set({ status: 'vacant', updatedAt: new Date() })
          .where(inArray(units.id, unitIds));
      }
    }
    
    // Delete associated records
    await db.delete(payments).where(eq(payments.tenantId, id));
    await db.delete(invoices).where(eq(invoices.tenantId, id));
    await db.delete(leases).where(eq(leases.tenantId, id));
    
    // Delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by email
    if (userData.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);
      
      if (existingUser.length > 0) {
        const [user] = await db
          .update(users)
          .set({ ...userData, updatedAt: new Date() })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        role: userData.role || "tenant",
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        isApproved: userData.isApproved !== undefined ? userData.isApproved : false,
      })
      .returning();
    
    return user;
  }

  // Access request operations
  async getAccessRequest(id: string): Promise<UserAccessRequest | undefined> {
    const [request] = await db.select().from(userAccessRequests).where(eq(userAccessRequests.id, id));
    return request;
  }

  async getAccessRequestByEmail(email: string): Promise<UserAccessRequest | undefined> {
    const [request] = await db.select().from(userAccessRequests).where(eq(userAccessRequests.email, email));
    return request;
  }

  async getPendingAccessRequests(): Promise<UserAccessRequest[]> {
    const requests = await db
      .select()
      .from(userAccessRequests)
      .where(eq(userAccessRequests.status, "pending"))
      .orderBy(desc(userAccessRequests.createdAt));
    return requests;
  }

  async createAccessRequest(requestData: InsertUserAccessRequest): Promise<UserAccessRequest> {
    const [request] = await db.insert(userAccessRequests).values(requestData).returning();
    return request;
  }

  async updateAccessRequest(id: string, requestData: Partial<InsertUserAccessRequest>): Promise<UserAccessRequest> {
    const [request] = await db
      .update(userAccessRequests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(userAccessRequests.id, id))
      .returning();
    return request;
  }

  // Property operations
  async getProperties(): Promise<PropertyWithDetails[]> {
    const propertiesWithUnits = await db
      .select({
        id: properties.id,
        name: properties.name,
        type: properties.type,
        address: properties.address,
        city: properties.city,
        state: properties.state,
        zipCode: properties.zipCode,
        description: properties.description,
        totalUnits: properties.totalUnits,
        status: properties.status,
        purchasePrice: properties.purchasePrice,
        purchaseDate: properties.purchaseDate,
        ownerId: properties.ownerId,
        managerId: properties.managerId,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
        occupiedUnits: sql<number>`count(${units.id}) filter (where ${units.status} = 'occupied')`,
        monthlyRevenue: sql<number>`sum(${units.monthlyRent}) filter (where ${units.status} = 'occupied')`,
      })
      .from(properties)
      .leftJoin(units, eq(properties.id, units.propertyId))
      .groupBy(properties.id)
      .orderBy(properties.name);

    return propertiesWithUnits.map(property => ({
      ...property,
      occupancyRate: property.totalUnits > 0 
        ? ((property.occupiedUnits || 0) / property.totalUnits) * 100 
        : 0,
    }));
  }

  async getProperty(id: string): Promise<PropertyWithDetails | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
    
    if (!property) return undefined;

    const propertyUnits = await db
      .select()
      .from(units)
      .where(eq(units.propertyId, id));

    const occupiedUnits = propertyUnits.filter(unit => unit.status === 'occupied').length;
    const monthlyRevenue = propertyUnits
      .filter(unit => unit.status === 'occupied')
      .reduce((sum, unit) => sum + Number(unit.monthlyRent), 0);

    return {
      ...property,
      units: propertyUnits,
      occupiedUnits,
      monthlyRevenue,
      occupancyRate: property.totalUnits > 0 ? (occupiedUnits / property.totalUnits) * 100 : 0,
    };
  }

  async createProperty(propertyData: InsertProperty): Promise<Property> {
    const processedData = {
      ...propertyData,
      waterRate: propertyData.waterRate ? String(propertyData.waterRate) : undefined,
      electricityRate: propertyData.electricityRate ? String(propertyData.electricityRate) : undefined,
      rentPenaltyAmount: propertyData.rentPenaltyAmount ? String(propertyData.rentPenaltyAmount) : undefined,
      taxRate: propertyData.taxRate ? String(propertyData.taxRate) : undefined,
      managementFeeAmount: propertyData.managementFeeAmount ? String(propertyData.managementFeeAmount) : undefined,
    };
    const [property] = await db.insert(properties).values(processedData).returning();
    return property;
  }

  async updateProperty(id: string, propertyData: Partial<InsertProperty>): Promise<Property> {
    const processedData = {
      ...propertyData,
      waterRate: propertyData.waterRate ? String(propertyData.waterRate) : propertyData.waterRate,
      electricityRate: propertyData.electricityRate ? String(propertyData.electricityRate) : propertyData.electricityRate,
      rentPenaltyAmount: propertyData.rentPenaltyAmount ? String(propertyData.rentPenaltyAmount) : propertyData.rentPenaltyAmount,
      taxRate: propertyData.taxRate ? String(propertyData.taxRate) : propertyData.taxRate,
      managementFeeAmount: propertyData.managementFeeAmount ? String(propertyData.managementFeeAmount) : propertyData.managementFeeAmount,
      updatedAt: new Date(),
    };
    const [property] = await db
      .update(properties)
      .set(processedData)
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    // Get all units for this property
    const propertyUnits = await db
      .select({ id: units.id })
      .from(units)
      .where(eq(units.propertyId, id));
    
    const unitIds = propertyUnits.map(unit => unit.id);
    
    if (unitIds.length > 0) {
      // Terminate all active leases for these units
      await db
        .update(leases)
        .set({ status: 'terminated', endDate: new Date(), updatedAt: new Date() })
        .where(and(inArray(leases.unitId, unitIds), eq(leases.status, 'active')));
      
      // Update all units to vacant status
      await db
        .update(units)
        .set({ status: 'vacant', updatedAt: new Date() })
        .where(inArray(units.id, unitIds));
      
      // Delete associated records
      await db.delete(payments).where(inArray(payments.unitId, unitIds));
      await db.delete(invoices).where(inArray(invoices.unitId, unitIds));
      await db.delete(leases).where(inArray(leases.unitId, unitIds));
    }
    
    // Delete all units associated with this property
    await db.delete(units).where(eq(units.propertyId, id));
    
    // Delete the property
    await db.delete(properties).where(eq(properties.id, id));
  }

  // Unit operations
  async getUnits(propertyId?: string): Promise<UnitWithDetails[]> {
    const baseQuery = db
      .select({
        unit: units,
        property: properties,
      })
      .from(units)
      .innerJoin(properties, eq(units.propertyId, properties.id));

    const result = propertyId 
      ? await baseQuery.where(eq(units.propertyId, propertyId)).orderBy(properties.name, units.unitNumber)
      : await baseQuery.orderBy(properties.name, units.unitNumber);

    return result.map(row => ({
      ...row.unit,
      property: row.property,
    }));
  }

  async getUnit(id: string): Promise<UnitWithDetails | undefined> {
    const [result] = await db
      .select({
        unit: units,
        property: properties,
      })
      .from(units)
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(eq(units.id, id));

    if (!result) return undefined;

    return {
      ...result.unit,
      property: result.property,
    };
  }

  async createUnit(unitData: InsertUnit): Promise<Unit> {
    const processedData = {
      ...unitData,
      bathrooms: unitData.bathrooms ? String(unitData.bathrooms) : undefined,
      monthlyRent: String(unitData.monthlyRent),
      securityDeposit: unitData.securityDeposit ? String(unitData.securityDeposit) : undefined,
      taxRate: unitData.taxRate ? String(unitData.taxRate) : undefined,
    };
    const [unit] = await db.insert(units).values(processedData).returning();
    return unit;
  }

  async updateUnit(id: string, unitData: Partial<InsertUnit>): Promise<Unit> {
    const processedData = {
      ...unitData,
      bathrooms: unitData.bathrooms ? String(unitData.bathrooms) : unitData.bathrooms,
      monthlyRent: unitData.monthlyRent ? String(unitData.monthlyRent) : unitData.monthlyRent,
      securityDeposit: unitData.securityDeposit ? String(unitData.securityDeposit) : unitData.securityDeposit,
      taxRate: unitData.taxRate ? String(unitData.taxRate) : unitData.taxRate,
      updatedAt: new Date(),
    };
    const [unit] = await db
      .update(units)
      .set(processedData)
      .where(eq(units.id, id))
      .returning();
    return unit;
  }

  async deleteUnit(id: string): Promise<void> {
    // Terminate any active leases for this unit
    await db
      .update(leases)
      .set({ status: 'terminated', endDate: new Date(), updatedAt: new Date() })
      .where(and(eq(leases.unitId, id), eq(leases.status, 'active')));
    
    // Delete associated records in proper order
    await db.delete(payments).where(eq(payments.unitId, id));
    await db.delete(invoices).where(eq(invoices.unitId, id));
    await db.delete(leases).where(eq(leases.unitId, id));
    
    // Delete the unit
    await db.delete(units).where(eq(units.id, id));
  }

  // Tenant operations
  async getTenants(): Promise<TenantWithDetails[]> {
    const tenantUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'tenant'))
      .orderBy(users.firstName, users.lastName);

    const result: TenantWithDetails[] = [];
    
    for (const tenant of tenantUsers) {
      const [activeLease] = await db
        .select()
        .from(leases)
        .where(and(eq(leases.tenantId, tenant.id), eq(leases.status, 'active')))
        .orderBy(desc(leases.createdAt))
        .limit(1);

      let unit = undefined;
      let property = undefined;

      if (activeLease) {
        const [unitData] = await db
          .select()
          .from(units)
          .where(eq(units.id, activeLease.unitId));

        if (unitData) {
          unit = unitData;
          const [propertyData] = await db
            .select()
            .from(properties)
            .where(eq(properties.id, unitData.propertyId));
          property = propertyData;
        }
      }

      result.push({
        id: tenant.id,
        username: tenant.username,
        email: tenant.email,
        passwordHash: tenant.passwordHash,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        phone: tenant.phone,
        role: tenant.role,
        profileImageUrl: tenant.profileImageUrl,
        isDeleted: tenant.isDeleted,
        deletedAt: tenant.deletedAt,
        deletedBy: tenant.deletedBy,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        isVerified: tenant.isVerified,
        verificationToken: tenant.verificationToken,
        verificationTokenExpiry: tenant.verificationTokenExpiry,
        resetPasswordToken: tenant.resetPasswordToken,
        resetPasswordTokenExpiry: tenant.resetPasswordTokenExpiry,
        lastLoginAt: tenant.lastLoginAt,
        failedLoginAttempts: tenant.failedLoginAttempts,
        lockedUntil: tenant.lockedUntil,
        currentLease: activeLease || undefined,
        unit: unit || undefined,
        property: property || undefined,
        lastPayment: undefined,
      } as TenantWithDetails);
    }

    return result;
  }

  async getTenant(id: string): Promise<TenantWithDetails | undefined> {
    const [result] = await db
      .select({
        tenant: users,
        lease: leases,
        unit: units,
        property: properties,
      })
      .from(users)
      .leftJoin(leases, and(eq(users.id, leases.tenantId), eq(leases.status, 'active')))
      .leftJoin(units, eq(leases.unitId, units.id))
      .leftJoin(properties, eq(units.propertyId, properties.id))
      .where(and(eq(users.id, id), eq(users.role, 'tenant')));

    if (!result) return undefined;

    return {
      ...result.tenant,
      currentLease: result.lease || undefined,
      unit: result.unit || undefined,
      property: result.property || undefined,
    };
  }

  // Lease operations
  async getLeases(): Promise<Lease[]> {
    return await db.select().from(leases).orderBy(desc(leases.createdAt));
  }

  async getLease(id: string): Promise<Lease | undefined> {
    const [lease] = await db.select().from(leases).where(eq(leases.id, id));
    return lease;
  }

  async createLease(leaseData: InsertLease): Promise<Lease> {
    const processedData = {
      ...leaseData,
      monthlyRent: String(leaseData.monthlyRent),
      securityDeposit: leaseData.securityDeposit ? String(leaseData.securityDeposit) : undefined,
    };
    const [lease] = await db.insert(leases).values(processedData).returning();
    
    // Update unit status to occupied
    await db.update(units).set({ status: 'occupied' }).where(eq(units.id, leaseData.unitId));
    
    // Activate tenant
    if (!leaseData.status || leaseData.status === 'active') {
      await db
        .update(users)
        .set({ isActive: true, isApproved: true, updatedAt: new Date() })
        .where(eq(users.id, leaseData.tenantId));
    }
    
    return lease;
  }

  async updateLease(id: string, leaseData: Partial<InsertLease>): Promise<Lease> {
    const processedData = {
      ...leaseData,
      monthlyRent: leaseData.monthlyRent ? String(leaseData.monthlyRent) : leaseData.monthlyRent,
      securityDeposit: leaseData.securityDeposit ? String(leaseData.securityDeposit) : leaseData.securityDeposit,
      updatedAt: new Date(),
    };
    const [lease] = await db
      .update(leases)
      .set(processedData)
      .where(eq(leases.id, id))
      .returning();
    return lease;
  }

  async deleteLease(id: string): Promise<void> {
    const lease = await this.getLease(id);
    if (lease) {
      await db.update(units).set({ status: 'vacant' }).where(eq(units.id, lease.unitId));
    }
    await db.delete(leases).where(eq(leases.id, id));
  }

  async getActiveLeaseByUnit(unitId: string): Promise<Lease | undefined> {
    const [lease] = await db
      .select()
      .from(leases)
      .where(and(eq(leases.unitId, unitId), eq(leases.status, 'active')));
    return lease;
  }

  // Payment operations
  async getPayments(): Promise<PaymentWithDetails[]> {
    const result = await db
      .select({
        payment: payments,
        tenant: users,
        unit: units,
        property: properties,
      })
      .from(payments)
      .innerJoin(users, eq(payments.tenantId, users.id))
      .innerJoin(units, eq(payments.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .orderBy(desc(payments.paymentDate));

    return result.map(row => ({
      ...row.payment,
      tenant: row.tenant,
      unit: row.unit,
      property: row.property,
    }));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const processedData = { ...paymentData, amount: String(paymentData.amount) };
    const [payment] = await db.insert(payments).values(processedData).returning();
    return payment;
  }

  async updatePayment(id: string, paymentData: Partial<InsertPayment>): Promise<Payment> {
    const processedData = {
      ...paymentData,
      amount: paymentData.amount ? String(paymentData.amount) : paymentData.amount,
      updatedAt: new Date(),
    };
    const [payment] = await db.update(payments).set(processedData).where(eq(payments.id, id)).returning();
    return payment;
  }

  async deletePayment(id: string): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  async getRecentPayments(limit: number = 10): Promise<PaymentWithDetails[]> {
    const result = await db
      .select({
        payment: payments,
        tenant: users,
        unit: units,
        property: properties,
      })
      .from(payments)
      .innerJoin(users, eq(payments.tenantId, users.id))
      .innerJoin(units, eq(payments.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(eq(payments.status, 'paid'))
      .orderBy(desc(payments.paymentDate))
      .limit(limit);

    return result.map(row => ({
      ...row.payment,
      tenant: row.tenant,
      unit: row.unit,
      property: row.property,
    }));
  }

  async getPaymentById(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByCheckoutRequestId(checkoutRequestId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.mpesaCheckoutRequestId, checkoutRequestId));
    return payment;
  }

  async getPaymentsByTenant(tenantId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.paymentDate));
  }

  // Invoice operations
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getTenantInvoices(tenantId: string, status?: string): Promise<Invoice[]> {
    const conditions = [eq(invoices.tenantId, tenantId)];
    if (status && status !== 'all') conditions.push(eq(invoices.status, status as any));
    return await db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.dueDate));
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const processedData = {
      ...invoiceData,
      amount: String(invoiceData.amount),
      amountDue: String(invoiceData.amountDue),
      amountPaid: invoiceData.amountPaid ? String(invoiceData.amountPaid) : undefined,
    };
    const [invoice] = await db.insert(invoices).values(processedData).returning();
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice> {
    const processedData = {
      ...invoiceData,
      amount: invoiceData.amount ? String(invoiceData.amount) : invoiceData.amount,
      amountDue: invoiceData.amountDue ? String(invoiceData.amountDue) : invoiceData.amountDue,
      amountPaid: invoiceData.amountPaid ? String(invoiceData.amountPaid) : invoiceData.amountPaid,
      updatedAt: new Date(),
    };
    const [invoice] = await db
      .update(invoices)
      .set(processedData)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Maintenance operations
  async getMaintenanceRequests(): Promise<MaintenanceRequestWithDetails[]> {
    const result = await db
      .select({
        request: maintenanceRequests,
        unit: units,
        property: properties,
        tenant: users,
      })
      .from(maintenanceRequests)
      .innerJoin(units, eq(maintenanceRequests.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .leftJoin(users, eq(maintenanceRequests.tenantId, users.id))
      .orderBy(
        sql`CASE 
          WHEN ${maintenanceRequests.priority} = 'urgent' THEN 1
          WHEN ${maintenanceRequests.priority} = 'high' THEN 2
          WHEN ${maintenanceRequests.priority} = 'normal' THEN 3
          ELSE 4
        END`,
        desc(maintenanceRequests.createdAt)
      );

    return result.map(row => ({
      ...row.request,
      unit: row.unit,
      property: row.property,
      tenant: row.tenant || undefined,
    }));
  }

  async getMaintenanceRequest(id: string): Promise<MaintenanceRequest | undefined> {
    const [request] = await db
      .select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.id, id));
    return request;
  }

  async createMaintenanceRequest(requestData: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const [request] = await db.insert(maintenanceRequests).values(requestData).returning();
    return request;
  }

  async updateMaintenanceRequest(id: string, requestData: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest> {
    const updateData: any = { ...requestData, updatedAt: new Date() };
    if (requestData.status === 'completed') updateData.completedAt = new Date();

    const [request] = await db
      .update(maintenanceRequests)
      .set(updateData)
      .where(eq(maintenanceRequests.id, id))
      .returning();
    return request;
  }

  async deleteMaintenanceRequest(id: string): Promise<void> {
    await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
  }

  // Payment status tracking
  async getTenantPaymentStatus(tenantId: string): Promise<{
    totalPaid: number;
    totalDue: number;
    overdueAmount: number;
    lastPaymentDate?: Date;
    rentStatus: 'current' | 'overdue' | 'partial';
  }> {
    const [paidResult] = await db
      .select({
        totalPaid: sql<number>`COALESCE(sum(${payments.amount}), 0)`,
        lastPaymentDate: sql<Date>`max(${payments.paymentDate})`
      })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.status, 'paid')));

    const [dueResult] = await db
      .select({ totalDue: sql<number>`COALESCE(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(eq(payments.tenantId, tenantId));

    const [overdueResult] = await db
      .select({ overdueAmount: sql<number>`COALESCE(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(
        eq(payments.tenantId, tenantId),
        sql`${payments.status} IN ('overdue', 'pending')`,
        sql`${payments.dueDate} < NOW()`
      ));

    const totalPaid = Number(paidResult?.totalPaid || 0);
    const totalDue = Number(dueResult?.totalDue || 0);
    const overdueAmount = Number(overdueResult?.overdueAmount || 0);
    
    let rentStatus: 'current' | 'overdue' | 'partial' = 'current';
    if (overdueAmount > 0) {
      rentStatus = totalPaid > 0 ? 'partial' : 'overdue';
    }

    return {
      totalPaid,
      totalDue,
      overdueAmount,
      lastPaymentDate: paidResult?.lastPaymentDate || undefined,
      rentStatus
    };
  }
  
  async getArrearsForTenant(tenantId: string): Promise<number> {
    const [result] = await db
      .select({ arrears: sql<number>`COALESCE(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(
        eq(payments.tenantId, tenantId),
        sql`${payments.status} IN ('overdue', 'pending')`,
        sql`${payments.dueDate} < NOW()`
      ));
    
    return Number(result?.arrears || 0);
  }
  
  async getClearedRentStatus(): Promise<Array<{
    tenantId: string;
    tenantName: string;
    unitNumber: string;
    propertyName: string;
    monthlyRent: number;
    lastPaymentDate?: Date;
    amountPaid: number;
    arrearsAmount: number;
    status: 'cleared' | 'partial' | 'overdue';
  }>> {
    const result = await db
      .select({
        tenantId: users.id,
        tenantName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        unitNumber: units.unitNumber,
        propertyName: properties.name,
        monthlyRent: leases.monthlyRent,
        lastPaymentDate: sql<Date>`(
          SELECT MAX(p.payment_date) 
          FROM payments p 
          WHERE p.tenant_id = ${users.id} AND p.status = 'paid'
        )`,
        amountPaid: sql<number>`(
          SELECT COALESCE(SUM(p.amount), 0) 
          FROM payments p 
          WHERE p.tenant_id = ${users.id} AND p.status = 'paid'
        )`,
        arrearsAmount: sql<number>`(
          SELECT COALESCE(SUM(p.amount), 0) 
          FROM payments p 
          WHERE p.tenant_id = ${users.id} 
          AND p.status IN ('overdue', 'pending') 
          AND p.due_date < NOW()
        )`
      })
      .from(users)
      .innerJoin(leases, eq(users.id, leases.tenantId))
      .innerJoin(units, eq(leases.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(eq(users.role, 'tenant'), eq(leases.status, 'active')))
      .orderBy(properties.name, units.unitNumber);

    return result.map(row => {
      const monthlyRent = Number(row.monthlyRent);
      const amountPaid = Number(row.amountPaid);
      const arrearsAmount = Number(row.arrearsAmount);
      
      let status: 'cleared' | 'partial' | 'overdue' = 'cleared';
      if (arrearsAmount > 0) {
        status = amountPaid >= monthlyRent ? 'partial' : 'overdue';
      }
      
      return {
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        unitNumber: row.unitNumber,
        propertyName: row.propertyName,
        monthlyRent,
        lastPaymentDate: row.lastPaymentDate || undefined,
        amountPaid,
        arrearsAmount,
        status
      };
    });
  }
  
  async getOverduePayments(): Promise<PaymentWithDetails[]> {
    const result = await db
      .select({
        payment: payments,
        tenant: users,
        unit: units,
        property: properties,
      })
      .from(payments)
      .innerJoin(users, eq(payments.tenantId, users.id))
      .innerJoin(units, eq(payments.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(sql`${payments.status} IN ('overdue', 'pending')`, sql`${payments.dueDate} < NOW()`))
      .orderBy(desc(payments.dueDate));

    return result.map(row => ({
      ...row.payment,
      tenant: row.tenant,
      unit: row.unit,
      property: row.property,
    }));
  }
  
  async createPaybillPayment(paymentData: {
    tenantId: string;
    unitId: string;
    amount: number;
    phoneNumber: string;
    transactionId: string;
    accountReference: string;
  }): Promise<Payment> {
    const tx = paymentData.transactionId; // make both txId & transactionId for UI compatibility
    const msisdn = normalizeMsisdn(paymentData.phoneNumber) || paymentData.phoneNumber;

    const [payment] = await db
      .insert(payments)
      .values({
        tenantId: paymentData.tenantId,
        unitId: paymentData.unitId,
        amount: paymentData.amount.toString(),
        paymentDate: new Date(),
        dueDate: new Date(),
        paymentMethod: 'mpesa',
        method: 'mpesa',                // <-- for UI (RentIncome expects .method)
        source: 'paybill',              // <-- distinguish from 'c2b'/'manual'
        status: 'paid',
        description: `M-Pesa paybill payment - Ref: ${paymentData.accountReference}`,
        transactionId: tx,
        txId: tx,                       // <-- make receipts work (server receipt route can use tx_id)
        mpesaPhoneNumber: msisdn,
        msisdn,
        mpesaTransactionId: tx,
        notes: `Automatic payment from paybill. Account reference: ${paymentData.accountReference}`
      } as any)
      .returning();
    
    return payment;
  }

  async findTenantByPhoneOrReference(
    phoneNumber: string,
    accountReference: string
  ): Promise<{ tenant: User; unit: Unit; lease: Lease } | null> {
    const msisdn = normalizeMsisdn(phoneNumber);
    const { unitToken } = parseAccountReference(accountReference);

    // 1) Try match by unit reference (BillRefNumber)
    if (unitToken) {
      const refRow = (
        await db.execute(sql`
          SELECT id AS unit_id
          FROM public.units
          WHERE upper(regexp_replace(unit_number, '[^A-Z0-9]+', '', 'g')) = ${unitToken}
          LIMIT 1;
        `)
      ).rows?.[0] as { unit_id?: string } | undefined;

      if (refRow?.unit_id) {
        const [lease] = await db
          .select()
          .from(leases)
          .where(and(eq(leases.unitId, refRow.unit_id), eq(leases.status, 'active')))
          .orderBy(desc(leases.createdAt))
          .limit(1);

        if (lease) {
          const [tenant] = await db.select().from(users).where(eq(users.id, lease.tenantId));
          const [unit] = await db.select().from(units).where(eq(units.id, lease.unitId));
          if (tenant && unit) return { tenant, unit, lease };
        }
      }
    }

    // 2) Fallback by phone (normalized)
    if (msisdn) {
      const ids = (
        await db.execute(sql`
          SELECT u.id AS tenant_id, l.id AS lease_id, un.id AS unit_id
          FROM public.users u
          JOIN public.leases l ON u.id = l.tenant_id AND l.status = 'active'
          JOIN public.units un ON un.id = l.unit_id
          WHERE (
            CASE
              WHEN u.phone IS NULL THEN ''
              ELSE
                CASE
                  WHEN regexp_replace(u.phone, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$'
                    THEN '254' || substr(regexp_replace(u.phone, '[^0-9]', '', 'g'), 2)
                  WHEN regexp_replace(u.phone, '[^0-9]', '', 'g') ~ '^7[0-9]{8}$'
                    THEN '254' || regexp_replace(u.phone, '[^0-9]', '', 'g')
                  ELSE regexp_replace(u.phone, '[^0-9]', '', 'g')
                END
            END
          ) = ${msisdn}
          LIMIT 1;
        `)
      ).rows?.[0] as { tenant_id?: string; lease_id?: string; unit_id?: string } | undefined;

      if (ids?.tenant_id && ids?.lease_id && ids?.unit_id) {
        const [tenant] = await db.select().from(users).where(eq(users.id, ids.tenant_id));
        const [lease] = await db.select().from(leases).where(eq(leases.id, ids.lease_id));
        const [unit] = await db.select().from(units).where(eq(units.id, ids.unit_id));
        if (tenant && lease && unit) return { tenant, unit, lease };
      }
    }

    return null;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalRevenue: number;
    occupiedUnits: number;
    totalUnits: number;
    pendingPayments: number;
    overdueCount: number;
    maintenanceCount: number;
    urgentMaintenanceCount: number;
  }> {
    const [revenueResult] = await db
      .select({ totalRevenue: sql<number>`COALESCE(sum(${units.monthlyRent}), 0)` })
      .from(units)
      .where(and(eq(units.status, 'occupied'), eq(units.isDeleted, false)));

    const [unitStats] = await db
      .select({
        totalUnits: count(),
        occupiedUnits: sql<number>`count(*) filter (where ${units.status} = 'occupied')`,
      })
      .from(units)
      .where(eq(units.isDeleted, false));

    const [paymentStats] = await db
      .select({
        pendingPayments: sql<number>`COALESCE(sum(${payments.amount}), 0)`,
        overdueCount: sql<number>`count(*) filter (where ${payments.status} = 'overdue')`,
      })
      .from(payments)
      .where(sql`${payments.status} IN ('pending', 'overdue')`);

    const [maintenanceStats] = await db
      .select({
        maintenanceCount: count(),
        urgentMaintenanceCount: sql<number>`count(*) filter (where ${maintenanceRequests.priority} = 'urgent')`,
      })
      .from(maintenanceRequests)
      .where(sql`${maintenanceRequests.status} IN ('open', 'in_progress')`);

    return {
      totalRevenue: Number(revenueResult?.totalRevenue || 0),
      occupiedUnits: Number(unitStats?.occupiedUnits || 0),
      totalUnits: Number(unitStats?.totalUnits || 0),
      pendingPayments: Number(paymentStats?.pendingPayments || 0),
      overdueCount: Number(paymentStats?.overdueCount || 0),
      maintenanceCount: Number(maintenanceStats?.maintenanceCount || 0),
      urgentMaintenanceCount: Number(maintenanceStats?.urgentMaintenanceCount || 0),
    };
  }

  // Expenditure operations
  async getExpenditures(propertyId?: string, category?: string): Promise<Expenditure[]> {
    let query = db.select().from(expenditures).where(eq(expenditures.isDeleted, false));
    if (propertyId) query = query.where(and(eq(expenditures.isDeleted, false), eq(expenditures.propertyId, propertyId)));
    if (category) query = query.where(and(eq(expenditures.isDeleted, false), eq(expenditures.category, category as any)));
    return await query.orderBy(desc(expenditures.paymentDate));
  }

  async getExpenditure(id: string): Promise<Expenditure | undefined> {
    const [expenditure] = await db
      .select()
      .from(expenditures)
      .where(and(eq(expenditures.id, id), eq(expenditures.isDeleted, false)));
    return expenditure;
  }

  async createExpenditure(expenditure: InsertExpenditure): Promise<Expenditure> {
    const [newExpenditure] = await db.insert(expenditures).values(expenditure).returning();
    return newExpenditure;
  }

  async updateExpenditure(id: string, expenditure: Partial<InsertExpenditure>): Promise<Expenditure> {
    const [updatedExpenditure] = await db
      .update(expenditures)
      .set({ ...expenditure, updatedAt: new Date() })
      .where(and(eq(expenditures.id, id), eq(expenditures.isDeleted, false)))
      .returning();
    
    if (!updatedExpenditure) throw new Error("Expenditure not found");
    return updatedExpenditure;
  }

  async deleteExpenditure(id: string): Promise<void> {
    await db
      .update(expenditures)
      .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(expenditures.id, id));
  }

  // Enterprise features - stubs
  async getPropertyRecurringFees(propertyId: string): Promise<PropertyRecurringFee[]> {
    throw new Error("Property recurring fees not implemented");
  }
  async createPropertyRecurringFee(fee: InsertPropertyRecurringFee): Promise<PropertyRecurringFee> {
    throw new Error("Property recurring fees not implemented");
  }
  async updatePropertyRecurringFee(id: string, fee: Partial<InsertPropertyRecurringFee>): Promise<PropertyRecurringFee> {
    throw new Error("Property recurring fees not implemented");
  }
  async deletePropertyRecurringFee(id: string): Promise<void> {
    throw new Error("Property recurring fees not implemented");
  }
  async getUnitRecurringFees(unitId: string): Promise<UnitRecurringFee[]> {
    throw new Error("Unit recurring fees not implemented");
  }
  async createUnitRecurringFee(fee: InsertUnitRecurringFee): Promise<UnitRecurringFee> {
    throw new Error("Unit recurring fees not implemented");
  }
  async updateUnitRecurringFee(id: string, fee: Partial<InsertUnitRecurringFee>): Promise<UnitRecurringFee> {
    throw new Error("Unit recurring fees not implemented");
  }
  async deleteUnitRecurringFee(id: string): Promise<void> {
    throw new Error("Unit recurring fees not implemented");
  }
  async getTenantDeposits(tenantId: string): Promise<TenantDeposit[]> {
    throw new Error("Tenant deposits not implemented");
  }
  async createTenantDeposit(deposit: InsertTenantDeposit): Promise<TenantDeposit> {
    throw new Error("Tenant deposits not implemented");
  }
  async updateTenantDeposit(id: string, deposit: Partial<InsertTenantDeposit>): Promise<TenantDeposit> {
    throw new Error("Tenant deposits not implemented");
  }
  async deleteTenantDeposit(id: string): Promise<void> {
    throw new Error("Tenant deposits not implemented");
  }
  async getTenantDocuments(tenantId: string): Promise<TenantDocument[]> {
    throw new Error("Tenant documents not implemented");
  }
  async createTenantDocument(document: InsertTenantDocument): Promise<TenantDocument> {
    throw new Error("Tenant documents not implemented");
  }
  async deleteTenantDocument(id: string): Promise<void> {
    throw new Error("Tenant documents not implemented");
  }
  async getTenantGadgets(tenantId: string): Promise<TenantGadget[]> {
    throw new Error("Tenant gadgets not implemented");
  }
  async createTenantGadget(gadget: InsertTenantGadget): Promise<TenantGadget> {
    throw new Error("Tenant gadgets not implemented");
  }
  async updateTenantGadget(id: string, gadget: Partial<InsertTenantGadget>): Promise<TenantGadget> {
    throw new Error("Tenant gadgets not implemented");
  }
  async deleteTenantGadget(id: string): Promise<void> {
    throw new Error("Tenant gadgets not implemented");
  }

  // Analytics placeholder used by routes.ts
  async getExpenditureAnalytics(): Promise<any> {
    throw new Error("Expenditure analytics not implemented");
  }
}

export const storage = new DatabaseStorage();
