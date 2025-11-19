import { QuickActions } from "@/components/quick-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DashboardStatsResponse,
  RecentPaymentsResponse,
  MaintenanceRequestsResponse,
} from "@/types/api";

/**
 * Expected types (unchanged)...
 */

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStatsResponse>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => (await apiRequest("GET", "/api/dashboard/stats")).json(),
    staleTime: 60_000,
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery<RecentPaymentsResponse>({
    queryKey: ["/api/dashboard/recent-payments"],
    queryFn: async () => (await apiRequest("GET", "/api/dashboard/recent-payments")).json(),
    staleTime: 60_000,
  });

  const { data: maintenanceRequests, isLoading: maintenanceLoading } =
    useQuery<MaintenanceRequestsResponse>({
      queryKey: ["/api/maintenance-requests"],
      queryFn: async () => (await apiRequest("GET", "/api/maintenance-requests")).json(),
      staleTime: 60_000,
    });

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-KE", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));

  const urgentMaintenance =
    (maintenanceRequests || []).filter((req) => req.priority === "urgent" && req.status !== "completed");

  // one-tap refresh that keeps the dashboard “live”
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
            <Button variant="outline" size="sm" onClick={refreshAll} className="shadow-soft">
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
            // NEW: Atlas Nova UI kpi look (subtle gradient, soft shadow, rounded-2xl)
            className="bg-gradient-to-br from-primary/10 to-accent/5 border shadow-soft rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
                <DollarSign className="h-5 w-5" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="total-revenue-value">
                  {formatKES(stats?.totalRevenue ?? 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">↗ Monthly rent collection</p>
            </CardContent>
          </Card>

          {/* Occupied Units */}
          <Card
            data-testid="occupied-units-card"
            className="bg-gradient-to-br from-primary/10 to-accent/5 border shadow-soft rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Occupied Units</h3>
                <HomeIcon className="h-5 w-5" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="occupied-units-value">
                  {(stats?.occupiedUnits ?? 0)}/{stats?.totalUnits ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalUnits
                  ? `${((stats.occupiedUnits / stats.totalUnits) * 100).toFixed(1)}% occupancy`
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
                <h3 className="text-sm font-medium text-muted-foreground">Pending Payments</h3>
                <Clock className="h-5 w-5" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="pending-payments-value">
                  {formatKES(stats?.pendingPayments ?? 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.overdueCount ?? 0} overdue payments
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
                <h3 className="text-sm font-medium text-muted-foreground">Maintenance</h3>
                <Wrench className="h-5 w-5" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold" data-testid="maintenance-count-value">
                  {stats?.maintenanceCount ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.urgentMaintenanceCount ?? 0} urgent requests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row - Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="ui-content"> {/* NEW: consistent surface */}
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Chart Coming Soon</p>
                  <p className="text-sm">Revenue analytics will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ui-content">
            <CardHeader>
              <CardTitle>Occupancy Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <HomeIcon className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Chart Coming Soon</p>
                  <p className="text-sm">Occupancy trends will be displayed here</p>
                </div>
              </div>
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
                      <p className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</p>
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
                      <p className="text-xs text-muted-foreground">Created {formatDate(request.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No urgent maintenance requests</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats (sample static for now) */}
          <Card data-testid="quick-stats-card" className="ui-content">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Collection Rate</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    {/* Use tokenized primary to keep brand color consistent in dark/light */}
                    <div className="w-4/5 h-full bg-primary" />
                  </div>
                  <span className="text-sm font-medium">94%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Response Time</span>
                <span className="text-sm font-medium">2.4 hrs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tenant Satisfaction</span>
                <span className="text-sm font-medium">4.6/5</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
