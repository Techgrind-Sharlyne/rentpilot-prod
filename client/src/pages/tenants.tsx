// client/src/pages/tenants.tsx

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Home,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Search,
  Eye,
  Edit,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Building,
} from "lucide-react";
import { useLocation } from "wouter";
import type { TenantWithDetails, UnitWithDetails, PropertyWithDetails } from "@/stubs/schema";
import { AddTenantModal } from "@/components/modals/add-tenant-modal";
import { AssignUnitModal } from "@/components/modals/assign-unit-modal";

// shadcn
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

/* ---------- helpers ---------- */
const PAGE_SIZE = 10;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount || 0);

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
};

const statusBadge = (status?: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">Completed</Badge>;
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 mr-1 -ml-0.5" /> Pending
        </Badge>
      );
    case "expired":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">Expired</Badge>;
    case "terminated":
      return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Terminated</Badge>;
    default:
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">—</Badge>;
  }
};

// Finance status badge (Cleared | Overdue | Prepaid)
const financeStatusBadge = (status?: "Cleared" | "Overdue" | "Prepaid") => {
  switch (status) {
    case "Cleared":
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Cleared</Badge>;
    case "Overdue":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">Overdue</Badge>;
    case "Prepaid":
      return <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">Prepaid</Badge>;
    default:
      return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">—</Badge>;
  }
};

/* ---------- finance types ---------- */
type TenantFinanceSummary = {
  tenantId: string;
  rent: number;
  paidThisMonth: number;
  arrearsToDate: number;
  balance: number;
  status: "Cleared" | "Overdue" | "Prepaid";
};

export default function Tenants() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showAssignUnitModal, setShowAssignUnitModal] = useState(false);
  const [selectedTenantForAssignment, setSelectedTenantForAssignment] = useState<TenantWithDetails | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Column visibility (added finance columns)
  const [columns, setColumns] = useState<Record<
    | "tenant"
    | "contact"
    | "propertyUnit"
    | "lease"
    | "monthlyRent"
    | "status"
    | "amountPaidMtd"
    | "arrearsToDate"
    | "currentMonthDue"
    | "balanceNow"
    | "financeStatus"
    | "assignUnit"
    | "actions",
    boolean
  >>({
    tenant: true,
    contact: true,
    propertyUnit: true,
    lease: true,
    monthlyRent: true,
    status: true,
    amountPaidMtd: true,
    arrearsToDate: true,
    currentMonthDue: true,
    balanceNow: true,
    financeStatus: true,
    assignUnit: true,
    actions: true,
  });

  // 🔥 Base data (NOW wired to apiRequest)
  const { data: tenants, isLoading: tenantsLoading } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/tenants"],
    queryFn: () => apiRequest<TenantWithDetails[]>("GET", "/tenants"),
  });

  const { data: units, isLoading: unitsLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
    queryFn: () => apiRequest<UnitWithDetails[]>("GET", "/units"),
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
    queryFn: () => apiRequest<PropertyWithDetails[]>("GET", "/properties"),
  });

  // 🔥 Finance data (from tenants summary endpoint)
  const {
    data: finance = [],
    isLoading: financeLoading,
    isError: financeError,
  } = useQuery<TenantFinanceSummary[]>({
    queryKey: ["/api/tenants/summary"],
    queryFn: () => apiRequest<TenantFinanceSummary[]>("GET", "/tenants/summary"),
  });

  const financeById = useMemo(() => {
    const m = new Map<string, TenantFinanceSummary>();
    for (const f of finance) m.set(f.tenantId, f);
    return m;
  }, [finance]);

  const propertyName = (id?: string | null) =>
    properties?.find((p) => p.id === id)?.name || (id ? `#${id.slice(0, 6)}` : "—");

  // Create lease
  const createLeaseMutation = useMutation({
    mutationFn: async ({ tenantId, unitId }: { tenantId: string; unitId: string }) => {
      const leaseData = {
        tenantId,
        unitId,
        monthlyRent: 20000,
        securityDeposit: 20000,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "active",
        moveInDate: new Date().toISOString().split("T")[0],
      };
      // NOTE: apiRequest normalizes "/api/leases" → "/api/leases" correctly
      return await apiRequest("POST", "/api/leases", leaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
      toast({ title: "Success", description: "Lease created successfully! Tenant can now pay rent." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create lease", variant: "destructive" });
    },
  });

  // Delete tenant
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiRequest("DELETE", `/api/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
      toast({ title: "Deleted", description: "Tenant removed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tenant.", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (
      tenants?.filter((t) => {
        const matchesProperty = selectedPropertyId === "all" || t.unit?.propertyId === selectedPropertyId;
        const matchesStatus = selectedStatus === "all" || t.currentLease?.status === selectedStatus;

        const f = financeById.get(t.id);
        const hay = [
          `${t.firstName} ${t.lastName}`,
          t.email,
          t.phone,
          t.unit?.unitNumber,
          propertyName(t.unit?.propertyId),
          t.currentLease?.monthlyRent?.toString(),
          f?.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !q || hay.includes(q);
        return matchesProperty && matchesStatus && matchesSearch;
      }) || []
    );
  }, [tenants, selectedPropertyId, selectedStatus, searchQuery, properties, financeById]);

  const tenantAnalytics = {
    totalTenants: tenants?.length || 0,
    activeTenants: tenants?.filter((t) => t.currentLease?.status === "active").length || 0,
    pendingTenants: tenants?.filter((t) => t.currentLease?.status === "pending").length || 0,
    totalMonthlyRent: tenants?.reduce((sum, t) => sum + (Number(t.currentLease?.monthlyRent) || 0), 0) || 0,
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVisibleChecked = current.length > 0 && current.every((t) => checkedIds.has(t.id));
  const anyChecked = checkedIds.size > 0;

  const toggleCheckAllVisible = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) current.forEach((t) => next.delete(t.id));
      else current.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const toggleCheckOne = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (tenantsLoading || unitsLoading || propertiesLoading) {
    return <div className="p-6">Loading tenants…</div>;
  }
  if (financeLoading) {
    return <div className="p-6">Loading finance…</div>;
  }
  if (financeError) {
    return <div className="p-6 text-red-600">Finance summary failed to load.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="tenants-page">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Tenants</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage tenant profiles, leases, finance status and contact information
          </p>
        </div>
        <Button onClick={() => setShowAddTenantModal(true)} className="bg-[#1a73e8] hover:bg-[#1666cc]">
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Colorful Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Tenants</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{tenantAnalytics.totalTenants}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Active Leases</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{tenantAnalytics.activeTenants}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Pending</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{tenantAnalytics.pendingTenants}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {formatCurrency(tenantAnalytics.totalMonthlyRent)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls row (Search + Property + Status + Columns picker) */}
      <Card className="overflow-hidden mb-3">
        <div className="px-4 py-3 border-b bg-slate-50/60 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search name, email, phone, unit, property…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedPropertyId}
              onValueChange={(v) => {
                setSelectedPropertyId(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatus}
              onValueChange={(v) => {
                setSelectedStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lease status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>

            {/* Columns picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  Display Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  {(
                    Object.keys(columns) as Array<
                      | "tenant"
                      | "contact"
                      | "propertyUnit"
                      | "lease"
                      | "monthlyRent"
                      | "status"
                      | "amountPaidMtd"
                      | "arrearsToDate"
                      | "currentMonthDue"
                      | "balanceNow"
                      | "financeStatus"
                      | "assignUnit"
                      | "actions"
                    >
                  ).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={columns[key]}
                        onCheckedChange={(v) => setColumns((c) => ({ ...c, [key]: Boolean(v) }))}
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    </label>
                  ))}
                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setColumns({
                          tenant: true,
                          contact: true,
                          propertyUnit: true,
                          lease: true,
                          monthlyRent: true,
                          status: true,
                          amountPaidMtd: true,
                          arrearsToDate: true,
                          currentMonthDue: true,
                          balanceNow: true,
                          financeStatus: true,
                          assignUnit: true,
                          actions: true,
                        })
                      }
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setColumns({
                          tenant: true,
                          contact: false,
                          propertyUnit: true,
                          lease: false,
                          monthlyRent: true,
                          status: true,
                          amountPaidMtd: true,
                          arrearsToDate: false,
                          currentMonthDue: true,
                          balanceNow: true,
                          financeStatus: true,
                          assignUnit: true,
                          actions: true,
                        })
                      }
                    >
                      Minimal
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white dark:bg-slate-900 sticky top-0">
              <tr className="border-y">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="h-4 w-4"
                    checked={current.length > 0 && allVisibleChecked}
                    onChange={toggleCheckAllVisible}
                  />
                </th>
                {columns.tenant && <th className="px-4 py-3 text-left text-slate-500 font-medium">Tenant</th>}
                {columns.contact && <th className="px-4 py-3 text-left text-slate-500 font-medium">Contact</th>}
                {columns.propertyUnit && (
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Property / Unit</th>
                )}
                {columns.lease && <th className="px-4 py-3 text-left text-slate-500 font-medium">Lease</th>}
                {columns.monthlyRent && (
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Monthly Rent</th>
                )}

                {/* Finance columns */}
                {columns.amountPaidMtd && (
                  <th className="px-4 py-3 text-right text-slate-500 font-medium">Paid (MTD)</th>
                )}
                {columns.arrearsToDate && (
                  <th className="px-4 py-3 text-right text-slate-500 font-medium">Arrears (to date)</th>
                )}
                {columns.currentMonthDue && (
                  <th className="px-4 py-3 text-right text-slate-500 font-medium">Current Month Due</th>
                )}
                {columns.balanceNow && (
                  <th className="px-4 py-3 text-right text-slate-500 font-medium">Balance Now</th>
                )}
                {columns.financeStatus && (
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Finance Status</th>
                )}

                {columns.status && <th className="px-4 py-3 text-left text-slate-500 font-medium">Lease Status</th>}
                {columns.assignUnit && (
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Assign Unit</th>
                )}
                {columns.actions && <th className="px-4 py-3 text-right text-slate-500 font-medium">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y">
              {current.map((t) => {
                const initials = (t.firstName?.[0] || "") + (t.lastName?.[0] || "");
                const rent = Number(t.currentLease?.monthlyRent) || 0;
                const f = financeById.get(t.id);

                const paidMtd = f?.paidThisMonth ?? 0;      // MTD Paid
                const arrears = f?.arrearsToDate ?? 0;      // Arrears (to date)
                const due = f?.rent ?? 0;                   // Current Month Due
                const balance = f?.balance ?? 0;            // Balance Now (cumulative)
                const fStatus = f?.status;                  // Cleared | Overdue | Prepaid

                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checkedIds.has(t.id)}
                        onChange={() => toggleCheckOne(t.id)}
                        aria-label={`Select ${t.firstName} ${t.lastName}`}
                      />
                    </td>

                    {columns.tenant && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-semibold">
                            {initials || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {t.firstName} {t.lastName}
                            </div>
                            <div className="text-xs text-slate-500">ID: {t.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {columns.contact && (
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{t.email || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{t.phone || "—"}</span>
                          </div>
                        </div>
                      </td>
                    )}

                    {columns.propertyUnit && (
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {propertyName(t.unit?.propertyId)}
                          </div>
                          <div className="text-xs text-slate-500">Unit {t.unit?.unitNumber || "—"}</div>
                        </div>
                      </td>
                    )}

                    {columns.lease && (
                      <td className="px-4 py-3">
                        <div className="text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{formatDate(t.currentLease?.startDate as any)}</span>
                            <span className="text-slate-400">–</span>
                            <span>{formatDate(t.currentLease?.endDate as any)}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Move-in: {formatDate(t.currentLease?.moveInDate as any)}
                          </div>
                        </div>
                      </td>
                    )}

                    {columns.monthlyRent && <td className="px-4 py-3 font-medium">{formatCurrency(rent)}</td>}

                    {/* Finance cells */}
                    {columns.amountPaidMtd && (
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(paidMtd)}</td>
                    )}
                    {columns.arrearsToDate && (
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(arrears)}</td>
                    )}
                    {columns.currentMonthDue && (
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(due)}</td>
                    )}
                    {columns.balanceNow && (
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(balance)}</td>
                    )}
                    {columns.financeStatus && <td className="px-4 py-3">{financeStatusBadge(fStatus)}</td>}

                    {columns.status && <td className="px-4 py-3">{statusBadge(t.currentLease?.status)}</td>}

                    {columns.assignUnit && (
                      <td className="px-4 py-3">
                        {!t.currentLease ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setSelectedTenantForAssignment(t);
                              setShowAssignUnitModal(true);
                            }}
                            disabled={createLeaseMutation.isPending}
                            data-testid={`button-assign-unit-${t.id}`}
                          >
                            <Home className="h-3.5 w-3.5 mr-1" /> Assign Unit
                          </Button>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            Assigned
                          </Badge>
                        )}
                      </td>
                    )}

                    {columns.actions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => console.log("view", t.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => console.log("edit", t.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => deleteTenantMutation.mutate(t.id)}
                            disabled={deleteTenantMutation.isPending}
                            aria-label="Delete tenant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {current.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center">
                    <div className="text-slate-500">No tenants match your filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* bulk + pagination */}
        <div className="flex items-center justify-between p-4 border-t bg-white/60 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={current.length > 0 && allVisibleChecked}
              onChange={toggleCheckAllVisible}
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {anyChecked ? `${checkedIds.size} selected` : "Select visible"}
            </span>
            {anyChecked && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Export Selected
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <AddTenantModal open={showAddTenantModal} onClose={() => setShowAddTenantModal(false)} />
      <AssignUnitModal
        open={showAssignUnitModal}
        onOpenChange={setShowAssignUnitModal}
        units={units || []}
        properties={properties || []}
        tenantName={
          selectedTenantForAssignment
            ? `${selectedTenantForAssignment.firstName} ${selectedTenantForAssignment.lastName}`
            : ""
        }
        onAssignUnit={(unitId) => {
          if (selectedTenantForAssignment) {
            createLeaseMutation.mutate({ tenantId: selectedTenantForAssignment.id, unitId });
            setShowAssignUnitModal(false);
            setSelectedTenantForAssignment(null);
          }
        }}
        isLoading={createLeaseMutation.isPending}
      />
    </div>
  );
}
