import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Home,
  Building,
  User,
  Edit,
  DollarSign,
  Bed,
  Bath,
  Square,
  X,
  Settings,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { PropertyWithDetails, UnitWithDetails } from "@/stubs/schema";
import { useLocation } from "wouter";
import { AddUnitModal } from "@/components/modals/add-unit-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// shadcn
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

/* ---------- helpers ---------- */
const PAGE_SIZE = 12;

const formatCurrency = (amount?: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(amount || 0));

const statusBadge = (status?: string) => {
  switch (status) {
    case "occupied":
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Occupied</Badge>;
    case "vacant":
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Vacant</Badge>;
    case "maintenance":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">Maintenance</Badge>;
    case "reserved":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">Reserved</Badge>;
    case "under_renovation":
      return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">Renovation</Badge>;
    default:
      return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">—</Badge>;
  }
};

export default function UnitsPage() {
  const [location] = useLocation();
  const { toast } = useToast();

  // filters / state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // modal / editing
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitWithDetails | null>(null);

  // bulk select
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // column visibility
  const [columns, setColumns] = useState<Record<
    "unit" | "property" | "tenant" | "status" | "rent" | "deposit" | "specs" | "actions",
    boolean
  >>({
    unit: true,
    property: true,
    tenant: true,
    status: true,
    rent: true,
    deposit: false,
    specs: true,
    actions: true,
  });

  // pick property from URL (?propertyId=...)
  useEffect(() => {
    if (location && location.includes("?")) {
      const urlParams = new URLSearchParams(location.split("?")[1]);
      const propertyIdFromUrl = urlParams.get("propertyId");
      if (propertyIdFromUrl && propertyIdFromUrl !== selectedPropertyId) {
        setSelectedPropertyId(propertyIdFromUrl);
        setPage(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  /** Data */
  const { data: properties, isLoading: propertiesLoading } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
  });

  const { data: units, isLoading: unitsLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  /** Mutations */
  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: string) => apiRequest("DELETE", `/api/units/${unitId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Deleted", description: "Unit removed successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete unit", variant: "destructive" }),
  });

  /** Analytics */
  const unitAnalytics = useMemo(() => {
    const list = units || [];
    const totalUnits = list.length;
    const occupiedUnits = list.filter((u) => u.status === "occupied").length;
    const vacantUnits = list.filter((u) => u.status === "vacant").length;
    const totalRevenue = list.reduce((sum, u) => sum + (Number(u.monthlyRent) || 0), 0);
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    return { totalUnits, occupiedUnits, vacantUnits, totalRevenue, occupancyRate };
  }, [units]);

  const propertyName = (id?: string | null) => properties?.find((p) => p.id === id)?.name || "—";

  /** Filter, search, paginate */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return (
      units?.filter((u) => {
        const matchesProperty = selectedPropertyId === "all" || u.propertyId === selectedPropertyId;
        const matchesStatus = selectedStatus === "all" || u.status === selectedStatus;

        const hay = [
          `unit ${u.unitNumber}`,
          propertyName(u.propertyId),
          u.tenant?.fullName,
          u.tenant?.email,
          String(u.monthlyRent ?? ""),
          String(u.securityDeposit ?? ""),
          String(u.bedrooms ?? ""),
          String(u.bathrooms ?? ""),
          String(u.squareFeet ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !q || hay.includes(q);
        return matchesProperty && matchesStatus && matchesSearch;
      }) || []
    );
  }, [units, selectedPropertyId, selectedStatus, searchQuery, properties]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allVisibleChecked = current.length > 0 && current.every((u) => checkedIds.has(u.id));
  const anyChecked = checkedIds.size > 0;

  const toggleCheckAllVisible = () =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) current.forEach((u) => next.delete(u.id));
      else current.forEach((u) => next.add(u.id));
      return next;
    });

  const toggleCheckOne = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (propertiesLoading || unitsLoading) return <div className="p-6">Loading units…</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="units-page">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Units</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {units?.length || 0} units across all properties
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUnit(null);
            setShowAddUnitModal(true);
          }}
          className="bg-[#1a73e8] hover:bg-[#1666cc]"
          data-testid="button-add-unit"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Unit
        </Button>
      </div>

      {/* Colorful Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Units</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{unitAnalytics.totalUnits}</p>
              </div>
              <Building className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Occupied</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{unitAnalytics.occupiedUnits}</p>
              </div>
              <Home className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Vacant</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{unitAnalytics.vacantUnits}</p>
              </div>
              <User className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(unitAnalytics.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
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
                placeholder="Search unit, property, tenant, or rent…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-testid="input-search-units"
              />
            </div>

            <Select
              value={selectedPropertyId}
              onValueChange={(v) => {
                setSelectedPropertyId(v);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="filter-property">
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
              <SelectTrigger data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="under_renovation">Under Renovation</SelectItem>
              </SelectContent>
            </Select>

            {/* Column picker */}
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
                      "unit" | "property" | "tenant" | "status" | "rent" | "deposit" | "specs" | "actions"
                    >
                  ).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm capitalize">
                      <Checkbox
                        checked={columns[key]}
                        onCheckedChange={(v) => setColumns((c) => ({ ...c, [key]: Boolean(v) }))}
                      />
                      {key.replace(/([A-Z])/g, " $1")}
                    </label>
                  ))}
                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setColumns({
                          unit: true,
                          property: true,
                          tenant: true,
                          status: true,
                          rent: true,
                          deposit: true,
                          specs: true,
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
                          unit: true,
                          property: true,
                          tenant: true,
                          status: true,
                          rent: true,
                          deposit: false,
                          specs: false,
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

        {/* Table */}
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
                {columns.unit && <th className="px-4 py-3 text-left text-slate-500 font-medium">Unit</th>}
                {columns.property && <th className="px-4 py-3 text-left text-slate-500 font-medium">Property</th>}
                {columns.tenant && <th className="px-4 py-3 text-left text-slate-500 font-medium">Tenant</th>}
                {columns.status && <th className="px-4 py-3 text-left text-slate-500 font-medium">Status</th>}
                {columns.rent && <th className="px-4 py-3 text-left text-slate-500 font-medium">Monthly Rent</th>}
                {columns.deposit && <th className="px-4 py-3 text-left text-slate-500 font-medium">Deposit</th>}
                {columns.specs && <th className="px-4 py-3 text-left text-slate-500 font-medium">Specs</th>}
                {columns.actions && <th className="px-4 py-3 text-right text-slate-500 font-medium">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y">
              {current.map((u) => {
                const specs = [
                  u.bedrooms ? `${u.bedrooms} bd` : "",
                  u.bathrooms ? `${u.bathrooms} ba` : "",
                  u.squareFeet ? `${u.squareFeet} ft²` : "",
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checkedIds.has(u.id)}
                        onChange={() => toggleCheckOne(u.id)}
                        aria-label={`Select Unit ${u.unitNumber}`}
                      />
                    </td>

                    {columns.unit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center">
                            <Home className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              Unit {u.unitNumber}
                            </div>
                            <div className="text-xs text-slate-500">ID: {u.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {columns.property && (
                      <td className="px-4 py-3">
                        <div className="text-slate-800 dark:text-slate-200">{propertyName(u.propertyId)}</div>
                      </td>
                    )}

                    {columns.tenant && (
                      <td className="px-4 py-3">
                        {u.tenant?.fullName ? (
                          <div className="text-slate-700 dark:text-slate-300">{u.tenant.fullName}</div>
                        ) : (
                          <div className="text-slate-400">—</div>
                        )}
                      </td>
                    )}

                    {columns.status && <td className="px-4 py-3">{statusBadge(u.status)}</td>}

                    {columns.rent && <td className="px-4 py-3 font-medium">{formatCurrency(Number(u.monthlyRent))}</td>}

                    {columns.deposit && (
                      <td className="px-4 py-3">{formatCurrency(Number(u.securityDeposit || 0))}</td>
                    )}

                    {columns.specs && <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{specs || "—"}</td>}

                    {columns.actions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingUnit(u);
                              setShowAddUnitModal(true);
                            }}
                            aria-label="Edit unit"
                            data-testid={`button-edit-unit-${u.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              // “Manage” – slot for future actions like assign tenant, etc.
                              setEditingUnit(u);
                              setShowAddUnitModal(true);
                            }}
                            aria-label="Manage unit"
                            data-testid={`button-manage-unit-${u.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`Delete Unit ${u.unitNumber}? This cannot be undone.`)) {
                                deleteUnitMutation.mutate(u.id);
                              }
                            }}
                            aria-label="Delete unit"
                            data-testid={`button-delete-unit-${u.id}`}
                            disabled={deleteUnitMutation.isPending}
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
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="text-slate-500">No units match your filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bulk + pagination */}
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

      {/* Add / Edit Unit */}
      <AddUnitModal
        open={showAddUnitModal}
        onClose={() => {
          setShowAddUnitModal(false);
          setEditingUnit(null);
        }}
        preSelectedPropertyId={selectedPropertyId !== "all" ? selectedPropertyId : undefined}
        editUnit={editingUnit}
      />
    </div>
  );
}
