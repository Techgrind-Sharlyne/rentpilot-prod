// API Response Types for TanStack Query (from shared schema)
import type {
  // Base entities
  Property,
  Unit,
  User,
  Lease,
  Payment,
  Invoice,
  MaintenanceRequest,
  // If your shared schema exports these "WithDetails" types, keep them.
  // If not, you can delete them and the related union types below will still compile.
  PropertyWithDetails,
  UnitWithDetails,
  TenantWithDetails,
  PaymentWithDetails,
  MaintenanceRequestWithDetails,
} from "@/stubs/schema";

// -------------------- Dashboard types --------------------

export interface DashboardStats {
  totalRevenue: number;
  occupiedUnits: number;
  totalUnits: number;
  pendingPayments: number;
  overdueCount: number;
  maintenanceCount: number;
  urgentMaintenanceCount: number;
}

export type DashboardStatsResponse = DashboardStats;

// Shapes returned by our dashboard endpoints
export type RecentPaymentRow = {
  id: string;
  amount: number;
  paymentDate: string;
  tenant?: { firstName: string; lastName: string } | null;
  unit?: { unitNumber: string } | null;
  property?: { name: string } | null;
};

export type MaintenanceRequestRow = {
  id: string;
  title: string;
  priority: "urgent" | "high" | "normal" | "low";
  status: "open" | "in_progress" | "completed";
  createdAt: string;
  unit?: { unitNumber: string } | null;
  property?: { name: string } | null;
};

export type RecentPaymentsResponse = RecentPaymentRow[];
export type MaintenanceRequestsResponse = MaintenanceRequestRow[];

// -------------------- Generic list/detail responses used elsewhere --------------------
// These unions let you keep stronger "WithDetails" types if they exist,
// but still compile if only base types are exported in @shared/schema.

export type PropertiesResponse =
  | PropertyWithDetails[]
  | Property[];

export type UnitsResponse =
  | UnitWithDetails[]
  | Unit[];

export type TenantsResponse =
  | TenantWithDetails[]        // from shared if present
  | Array<{
      id: string;
      userId: string;
      unitId: string | null;
      // minimal fields you commonly read in UI
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    }>;

export type PaymentsResponse =
  | PaymentWithDetails[]
  | Payment[];

export type PropertyResponse = Property;
export type UnitResponse = Unit;
export type UserResponse = User;
export type LeaseResponse = Lease;
export type PaymentResponse = Payment;
export type InvoiceResponse = Invoice;
export type MaintenanceRequestResponse = MaintenanceRequest;
