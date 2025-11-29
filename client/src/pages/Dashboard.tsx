// client/src/pages/Dashboard.tsx
import { useMemo } from "react";
import { QuickActions } from "@/components/quick-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Home as HomeIcon,
  Clock,
  Wrench,
  TrendingUp,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";

import type {
  RecentPaymentsResponse,
  MaintenanceRequestsResponse,
} from "@/types/api";
import type { TenantWithDetails, UnitWithDetails } from "@/stubs/schema";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/**
 * Finance summary shape returned by /api/tenants/summary
 * (must match server/routes.finance-summary.ts output)
 */
type TenantFinanceSummary = {
  tenantId: string;
  rent: number;
  paidThisMonth: number;
  arrearsToDate: number;
  balance: number;
  status: "Cleared" | "Overdue" | "Prepaid";
};

export default function Dashboard() {
  const qc = useQueryClient();

  // --- Base data the app already uses elsewhere ---

  const {
    data: tenants = [],
    isLoading: tenantsLoading,
    isError: tenantsError,
  } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/tenants"],
    queryFn: () => apiRequest<TenantWithDetails[]>("GET", "/api/tenants"),
    staleTime: 60_000,
  });

  const {
    data: units = [],
    isLoading: unitsLoading,
    isError: unitsError,
  } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
    queryFn: () => apiRequest<UnitWithDetails[]>("GET", "/api/units"),
    staleTime: 60_000,
  });

  const {
    data: financeSummary = [],
    isLoading: financeLoading,
    isError: financeError,
  } = useQuery<TenantFinanceSummary[]>({
    queryKey: ["/api/tenants/summary"],
    queryFn: () =>
      apiRequest<TenantFinanceSummary[]>("GET", "/api/tenants/summary"),
    staleTime: 60_000,
  });

  const { data: recentPayments = [], isLoading: paymentsLoading } =
    useQuery<RecentPaymentsResponse>({
      queryKey: ["/api/dashboard/recent-payments"],
      queryFn: () =>
        apiRequest<RecentPaymentsResponse>("GET", "/api/dashboard/recent-payments"),
      staleTime: 60_000,
    });

  const { data: maintenanceRequests = [], isLoading: maintenanceLoading } =
    useQuery<MaintenanceRequestsResponse>({
      queryKey: ["/api/maintenance-requests"],
      queryFn: () =>
        apiRequest<MaintenanceRequestsResponse>("GET", "/api/maintenance-requests"),
      staleTime: 60_000,
    });

  // --- Derived dashboard stats from existing data ---

  const stats = useMemo(() => {
    if (!financeSummary || !units) {
      return {
        totalRevenue: 0,
        occupiedUnits: 0,
        totalUnits: 0,
        pendingPayments: 0,
        overdueCount: 0,
        maintenanceCount: maintenanceRequests.length,
        urgentMaintenanceCount: maintenanceRequests.filter(
          (m) => m.priority === "urgent" && m.status !== "completed"
        ).length,
      };
    }

    const totalRevenue = financeSummary.reduce(
      (sum, f) => sum + (Number(f.paidThisMonth) || 0),
      0
    );

    const pendingPayments = financeSummary.reduce(
      (sum, f) => sum + (Number(f.arrearsToDate) || 0),
      0
    );

    const overdueCount = financeSummary.filter(
      (f) => f.status === "Overdue"
    ).length;

    const totalUnits = units.length;

    const occupiedUnits = tenants.reduce((count, t: any) => {
      if (t.currentLease && t.currentLease.status === "active") {
        return count + 1;
      }
      return count;
    }, 0);

    const maintenanceCount = maintenanceRequests.length;
    const urgentMaintenanceCount = maintenanceRequests.filter(
      (m) => m.priority === "urgent" && m.status !== "completed"
    ).length;

    return {
      totalRevenue,
      occupiedUnits,
      totalUnits,
      pendingPayments,
      overdueCount,
      maintenanceCount,
      urgentMaintenanceCount,
    };
  }, [financeSummary, units, tenants, maintenanceRequests]);

  const anyCoreLoading =
    tenantsLoading || unitsLoading || financeLoading || maintenanceLoading;

  // --- Chart data: revenue per tenant (this month) ---

  const revenueByTenant = useMemo(() => {
    if (!financeSummary || financeSummary.length === 0) return [];

    const financeByTenant = new Map(
      financeSummary.map((f) => [f.tenantId, f])
    );

    return tenants
      .map((t: any) => {
        const summary = financeByTenant.get(t.id);
        if (!summary) return null;

        const nameFromFull =
          t.fullName ||
          [t.firstName, t.lastName].filter(Boolean).join(" ").trim();
        const label = nameFromFull || "Tenant";

        return {
          name:
            label.length > 14
              ? label.slice(0, 13).trimEnd() + "…"
              : label || "Tenant",
          paidThisMonth: Number(summary.paidThisMonth) || 0,
          arrears: Number(summary.arrearsToDate) || 0,
        };
      })
      .filter(Boolean) as { name: string; paidThisMonth: number; arrears: number }[];
  }, [financeSummary, tenants]);

  // --- Chart data: occupancy pie ---

  const occupancyData = useMemo(() => {
    const occ = stats.occupiedUnits;
    const vac = Math.max(stats.totalUnits - stats.occupiedUnits, 0);
    return [
      { name: "Occupied", value: occ },
      { name: "Vacant", value: vac },
    ];
  }, [stats.occupiedUnits, stats.totalUnits]);

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));

  const urgentMaintenance =
    (maintenanceRequests || []).filter(
      (req) => req.priority === "urgent" && req.status !== "completed"
    );

  // one-tap refresh that keeps the dashboard “live”
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/tenants"] });
    qc.invalidateQueries({ queryKey: ["/api/units"] });
    qc.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard/recent-payments"] });
    qc.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Welcome back! Here's your property overview"
        rightSlot={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              className="shadow-soft"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Quick actions BELOW header */}
      <div className="px-6">
        <QuickActions
          onAddPropertySuccess={refreshAll}
          onBulkInvoiceSuccess={refreshAll}
          onQuickRefresh={refreshAll}
        />
      </div>

      {/* Page surface spacing + tokenized background in case this page is mounted standalone */}
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <Card
            data-testid="total-revenue-card"
            className="bg-gradient-to-br from-primary/10 to-accent/5 border shadow-soft rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Total Revenue (MTD)
                </h3>
                <DollarSign className="h-5 w-5" />
              </div>
              {anyCoreLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div
                  className="text-2xl font-bold"
                  data-testid="total-revenue-value"
                >
                  {formatKES(stats.totalRevenue)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                ↗ Sum of all tenant payments this month
              </p>
            </CardContent>
          </Card>

          {/* Occupied Units */}
          <Card
            data-testid="occupied-units-card"
            className="bg-gradient-to-br from-primary/10 to-accent/5 border shadow-soft rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Occupied Units
                </h3>
                <HomeIcon className="h-5 w-5" />
              </div>
              {anyCoreLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div
                  className="text-2xl font-bold"
                  data-testid="occupied-units-value"
                >
                  {stats.occupiedUnits}/{stats.totalUnits}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalUnits
                  ? `${(
                      (stats.occupiedUnits / (stats.totalUnits || 1)) *
                      100
                    ).toFixed(1)}% occupancy`
                  : "No units"}
              </p>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card
            data-testid="pending-payments-card"
            className="bg-gradient-to-br from-primary/10 to-accent/5 border shadow-soft rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Pending Payments (Arrears)
                </h3>
                <Clock className="h-5 w-5" />
              </div>
              {anyCoreLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div
                  className="text-2xl font-bold"
                  data-testid="pending-payments-value"
                >
                  {formatKES(stats.pendingPayments)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats.overdueCount} tenants overdue
              </p>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card
            data-testid="maintenance-card"
            className="bg-gradient-to-br from-primary/10 to-accent/5 border shadow-soft rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Maintenance
                </h3>
                <Wrench className="h-5 w-5" />
              </div>
              {maintenanceLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div
                  className="text-2xl font-bold"
                  data-testid="maintenance-count-value"
                >
                  {stats.maintenanceCount}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats.urgentMaintenanceCount} urgent requests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trends - simple bar chart per tenant */}
          <Card className="ui-content">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue Trends (MTD by Tenant)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {anyCoreLoading ? (
                <Skeleton className="w-full h-full" />
              ) : revenueByTenant.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No payments this month yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByTenant}>
                    <XAxis dataKey="name" fontSize={11} interval={0} />
                    <YAxis
                      tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(val: any) => formatKES(Number(val))}
                    />
                    <Legend />
                    <Bar dataKey="paidThisMonth" name="Paid (MTD)" />
                    <Bar dataKey="arrears" name="Arrears To Date" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Occupancy Overview - pie chart */}
          <Card className="ui-content">
            <CardHeader>
              <CardTitle>Occupancy Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {anyCoreLoading ? (
                <Skeleton className="w-full h-full" />
              ) : stats.totalUnits === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No units configured yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occupancyData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="45%"
                      outerRadius="70%"
                      paddingAngle={4}
                    >
                      {occupancyData.map((entry, index) => (
                        <Cell key={index} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Payments */}
          <Card data-testid="recent-payments-card" className="ui-content">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentsLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : recentPayments && recentPayments.length > 0 ? (
                recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                    data-testid={`payment-${payment.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {payment.tenant?.firstName} {payment.tenant?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.unit?.unitNumber} - {payment.property?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatKES(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent payments</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Urgent Maintenance */}
          <Card data-testid="urgent-maintenance-card" className="ui-content">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Urgent Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {maintenanceLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : urgentMaintenance.length > 0 ? (
                urgentMaintenance.slice(0, 3).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start space-x-3 py-2"
                    data-testid={`urgent-maintenance-${request.id}`}
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{request.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.unit?.unitNumber} - {request.property?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No urgent maintenance requests
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats (still simple, but now backed by real stats where possible) */}
          <Card data-testid="quick-stats-card" className="ui-content">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Collection Rate (MTD)
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width:
                          stats.pendingPayments + stats.totalRevenue > 0
                            ? `${
                                (stats.totalRevenue /
                                  (stats.totalRevenue + stats.pendingPayments)) *
                                100
                              }%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {stats.pendingPayments + stats.totalRevenue > 0
                      ? `${(
                          (stats.totalRevenue /
                            (stats.totalRevenue + stats.pendingPayments)) *
                          100
                        ).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Active Tenants
                </span>
                <span className="text-sm font-medium">
                  {tenants.length || 0}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Overdue Tenants
                </span>
                <span className="text-sm font-medium">
                  {stats.overdueCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
