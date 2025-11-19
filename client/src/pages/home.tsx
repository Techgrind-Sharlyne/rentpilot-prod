import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/stubs/schema";
import { Building2, Users, DollarSign, Wrench, LogOut } from "lucide-react";

/** =========================
 * Types expected from the API
 * ==========================*/
type DashboardStats = {
  propertiesCount: number;
  propertiesDelta?: number; // e.g. +2 from last month
  activeTenants: number;
  tenantsDelta?: number; // e.g. +5 from last month
  monthlyRevenue: number; // in KES
  revenueDeltaPct?: number; // e.g. +8 (%)
  maintenanceOpen: number;
  maintenanceDelta?: number; // e.g. -3 from last week
};

type ActivityItem =
  | {
      id: string | number;
      type: "payment";
      title: string; // "Payment received from John Doe"
      unit?: string; // "Unit 101"
      amount: number; // 120000
      currency?: "KES";
      createdAt: string; // ISO
    }
  | {
      id: string | number;
      type: "maintenance";
      title: string; // "New maintenance request"
      unit?: string; // "Unit 205"
      detail?: string; // "Plumbing issue"
      status: "Pending" | "In Progress" | "Complete";
      createdAt: string;
    }
  | {
      id: string | number;
      type: "lease";
      title: string; // "Lease renewal signed"
      unit?: string; // "Unit 301"
      tenant?: string; // "Sarah Johnson"
      status: "Pending" | "Complete";
      createdAt: string;
    };

function formatKES(n: number) {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
  } catch {
    // Fallback
    return `KSh ${n.toLocaleString("en-KE")}`;
  }
}

function DeltaText({ value, suffix = "" }: { value?: number; suffix?: string }) {
  if (value === undefined || value === null) return null;
  const positive = value > 0;
  const neutral = value === 0;
  const color = neutral ? "text-muted-foreground" : positive ? "text-green-600" : "text-red-600";
  const sign = neutral ? "" : positive ? "+" : "";
  return (
    <p className={`text-xs ${color}`}>
      {sign}
      {value}
      {suffix ? ` ${suffix}` : ""}
    </p>
  );
}

function DeltaPct({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  const positive = value > 0;
  const neutral = value === 0;
  const color = neutral ? "text-muted-foreground" : positive ? "text-green-600" : "text-red-600";
  const sign = neutral ? "" : positive ? "+" : "";
  return <p className={`text-xs ${color}`}>{sign}{value}% from last month</p>;
}

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [errorActivity, setErrorActivity] = useState<string | null>(null);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Administrator";
      case "landlord": return "Landlord";
      case "property_manager": return "Property Manager";
      case "agent": return "Agent";
      case "tenant": return "Tenant";
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "landlord": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "property_manager": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "agent": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "tenant": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  useEffect(() => {
    let ignore = false;

    // Stats
    setLoadingStats(true);
    fetch("/api/dashboard/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<DashboardStats>;
      })
      .then((data) => {
        if (!ignore) {
          setStats(data);
          setErrorStats(null);
        }
      })
      .catch((e) => !ignore && setErrorStats(e.message))
      .finally(() => !ignore && setLoadingStats(false));

    // Recent Activity
    setLoadingActivity(true);
    fetch("/api/dashboard/recent-activity")
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = (await r.json()) as { items: ActivityItem[] } | ActivityItem[];
        const items = Array.isArray(j) ? j : j.items ?? [];
        return items;
      })
      .then((items) => {
        if (!ignore) {
          setActivity(items);
          setErrorActivity(null);
        }
      })
      .catch((e) => !ignore && setErrorActivity(e.message))
      .finally(() => !ignore && setLoadingActivity(false));

    return () => { ignore = true; };
  }, []);

  const role = (user as User | undefined)?.role ?? "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">REMS Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-300">Welcome back,</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            {role && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(role)}`}>
                {getRoleDisplayName(role)}
              </span>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Properties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <>
                  <Skeleton className="h-7 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : errorStats ? (
                <p className="text-sm text-red-600">Failed to load.</p>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-properties-count">
                    {stats?.propertiesCount ?? 0}
                  </div>
                  <DeltaText value={stats?.propertiesDelta} suffix="from last month" />
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Tenants */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <>
                  <Skeleton className="h-7 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : errorStats ? (
                <p className="text-sm text-red-600">Failed to load.</p>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-tenants-count">
                    {stats?.activeTenants ?? 0}
                  </div>
                  <DeltaText value={stats?.tenantsDelta} suffix="from last month" />
                </>
              )}
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <>
                  <Skeleton className="h-7 w-32 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </>
              ) : errorStats ? (
                <p className="text-sm text-red-600">Failed to load.</p>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-revenue">
                    {formatKES(stats?.monthlyRevenue ?? 0)}
                  </div>
                  <DeltaPct value={stats?.revenueDeltaPct} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Requests</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <>
                  <Skeleton className="h-7 w-10 mb-2" />
                  <Skeleton className="h-3 w-36" />
                </>
              ) : errorStats ? (
                <p className="text-sm text-red-600">Failed to load.</p>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-maintenance-count">
                    {stats?.maintenanceOpen ?? 0}
                  </div>
                  <DeltaText value={stats?.maintenanceDelta} suffix="from last week" />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role-based Content */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(role === "super_admin" || role === "landlord" || role === "property_manager") && (
                <>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/properties/new">
                      <Building2 className="h-4 w-4 mr-2" />
                      Add New Property
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/tenants/new">
                      <Users className="h-4 w-4 mr-2" />
                      Add New Tenant
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/payments/new">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Record Payment
                    </Link>
                  </Button>
                </>
              )}
              {role === "tenant" && (
                <>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/billing/pay">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Pay Rent
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/maintenance/new">
                      <Wrench className="h-4 w-4 mr-2" />
                      Submit Maintenance Request
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="space-y-4">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-5 w-72" />
                  <Skeleton className="h-5 w-60" />
                </div>
              ) : errorActivity ? (
                <p className="text-sm text-red-600">Failed to load recent activity.</p>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="space-y-4">
                  {activity.slice(0, 6).map((item) => {
                    if (item.type === "payment") {
                      return (
                        <div key={`pay-${item.id}`} className="flex items-center">
                          <div className="ml-0 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {item.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.unit ? `${item.unit} - ` : ""}{formatKES(item.amount)}
                            </p>
                          </div>
                          <div className="ml-auto font-medium">{formatKES(item.amount)}</div>
                        </div>
                      );
                    }
                    if (item.type === "maintenance") {
                      return (
                        <div key={`mnt-${(item as any).id}`} className="flex items-center">
                          <div className="ml-0 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {item.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.unit ? `${item.unit} - ` : ""}{item.detail}
                            </p>
                          </div>
                          <div className={`ml-auto font-medium ${item.status === "Pending" ? "text-yellow-600" : item.status === "Complete" ? "text-green-600" : ""}`}>
                            {item.status}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={`lease-${(item as any).id}`} className="flex items-center">
                        <div className="ml-0 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {item.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.unit ? `${item.unit} - ` : ""}
                            {(item as any).tenant ?? ""}
                          </p>
                        </div>
                        <div className={`ml-auto font-medium ${ (item as any).status === "Complete" ? "text-green-600" : "text-muted-foreground"}`}>
                          {(item as any).status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
