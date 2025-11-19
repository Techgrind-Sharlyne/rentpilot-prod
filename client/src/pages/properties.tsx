import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Building,
  Edit,
  Home,
  Eye,
  DollarSign,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useLocation } from "wouter";
import type { PropertyWithDetails } from "@/stubs/schema";
import { AddPropertyModal } from "@/components/modals/add-property-modal";

// shadcn
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

/* ---------- helpers ---------- */
const PAGE_SIZE = 12;

const formatCurrency = (amount?: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(amount || 0));

const formatDate = (date?: string | number | Date | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
};

export default function Properties() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithDetails | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [page, setPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Column visibility
  const [columns, setColumns] = useState<Record<
    "property" | "location" | "type" | "units" | "occupancy" | "revenue" | "created" | "actions",
    boolean
  >>({
    property: true,
    location: true,
    type: true,
    units: true,
    occupancy: true,
    revenue: true,
    created: true,
    actions: true,
  });

  /** Data */
  const { data: properties, isLoading } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/properties");
      const data = await response.json();
      return (Array.isArray(data) ? data : []) as PropertyWithDetails[];
    },
  });

  /** Mutations */
  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      apiRequest("PUT", `/api/properties/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Success", description: "Property updated successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update property", variant: "destructive" }),
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => apiRequest("DELETE", `/api/properties/${propertyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Deleted", description: "Property removed successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete property", variant: "destructive" }),
  });

  /** Analytics */
  const analytics = useMemo(() => {
    if (!properties) return null;
    const totalProperties = properties.length;
    const totalUnits = properties.reduce((s, p) => s + (p.totalUnits || 0), 0);
    const totalOccupied = properties.reduce((s, p) => s + (Number(p.occupiedUnits) || 0), 0);
    const totalRevenue = properties.reduce((s, p) => s + (Number(p.monthlyRevenue) || 0), 0);
    const avgOccupancy =
      totalProperties > 0
        ? properties.reduce((s, p) => s + (p.occupancyRate || 0), 0) / totalProperties
        : 0;
    return { totalProperties, totalUnits, totalOccupied, totalRevenue, avgOccupancy };
  }, [properties]);

  /** Filter, sort, paginate */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base =
      properties?.filter((p) => {
        const hay = [
          p.name,
          p.type?.replace("_", " "),
          p.city,
          p.state,
          p.address,
          String(p.totalUnits ?? ""),
          String(p.occupiedUnits ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return !q || hay.includes(q);
      }) ?? [];

    base.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return sortOrder === "latest" ? db - da : da - db;
    });

    return base;
  }, [properties, searchQuery, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allVisibleChecked = current.length > 0 && current.every((p) => checkedIds.has(p.id));
  const anyChecked = checkedIds.size > 0;

  const toggleCheckAllVisible = () =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) current.forEach((p) => next.delete(p.id));
      else current.forEach((p) => next.add(p.id));
      return next;
    });

  const toggleCheckOne = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (isLoading) return <div className="p-6">Loading properties…</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="properties-page">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Properties</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage and monitor your real estate portfolio</p>
        </div>
        <Button
          onClick={() => {
            setEditingProperty(null);
            setShowAddPropertyModal(true);
          }}
          className="bg-[#1a73e8] hover:bg-[#1666cc]"
          data-testid="button-add-property"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Colorful Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Properties</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{analytics.totalProperties}</p>
                </div>
                <Building className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Units</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {analytics.totalOccupied}/{analytics.totalUnits}
                  </p>
                  <p className="text-xs text-purple-500">Occupied</p>
                </div>
                <Home className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Avg Occupancy</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {Math.round(analytics.avgOccupancy)}%
                  </p>
                </div>
                <Eye className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls row (Search + Sort + Columns picker) */}
      <Card className="overflow-hidden mb-3">
        <div className="px-4 py-3 border-b bg-slate-50/60 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search name, city, address, type…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-testid="input-search-properties"
              />
            </div>

            <Select
              value={sortOrder}
              onValueChange={(v: "latest" | "oldest") => {
                setSortOrder(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
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
                      "property" | "location" | "type" | "units" | "occupancy" | "revenue" | "created" | "actions"
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
                          property: true,
                          location: true,
                          type: true,
                          units: true,
                          occupancy: true,
                          revenue: true,
                          created: true,
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
                          property: true,
                          location: true,
                          type: false,
                          units: true,
                          occupancy: true,
                          revenue: true,
                          created: false,
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
                {columns.property && <th className="px-4 py-3 text-left text-slate-500 font-medium">Property</th>}
                {columns.location && <th className="px-4 py-3 text-left text-slate-500 font-medium">Location</th>}
                {columns.type && <th className="px-4 py-3 text-left text-slate-500 font-medium">Type</th>}
                {columns.units && <th className="px-4 py-3 text-left text-slate-500 font-medium">Units</th>}
                {columns.occupancy && <th className="px-4 py-3 text-left text-slate-500 font-medium">Occupancy</th>}
                {columns.revenue && <th className="px-4 py-3 text-left text-slate-500 font-medium">Monthly Revenue</th>}
                {columns.created && <th className="px-4 py-3 text-left text-slate-500 font-medium">Created</th>}
                {columns.actions && <th className="px-4 py-3 text-right text-slate-500 font-medium">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y">
              {current.map((p) => {
                const occupancy = Math.round(Number(p.occupancyRate || 0));
                const occColor =
                  occupancy > 80 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" :
                  occupancy > 50 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" :
                                   "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checkedIds.has(p.id)}
                        onChange={() => toggleCheckOne(p.id)}
                        aria-label={`Select ${p.name}`}
                      />
                    </td>

                    {columns.property && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center">
                            <Building className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</div>
                            <div className="text-xs text-slate-500">ID: {p.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {columns.location && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">
                            {(p.address ? `${p.address}, ` : "") + `${p.city}, ${p.state}`}
                          </span>
                        </div>
                      </td>
                    )}

                    {columns.type && (
                      <td className="px-4 py-3 capitalize">{p.type?.replace("_", " ") || "—"}</td>
                    )}

                    {columns.units && (
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {p.occupiedUnits || 0}/{p.totalUnits || 0}
                        </span>
                      </td>
                    )}

                    {columns.occupancy && (
                      <td className="px-4 py-3">
                        <Badge className={occColor}>{occupancy}%</Badge>
                      </td>
                    )}

                    {columns.revenue && (
                      <td className="px-4 py-3 font-medium">{formatCurrency(p.monthlyRevenue)}</td>
                    )}

                    {columns.created && <td className="px-4 py-3">{formatDate(p.createdAt)}</td>}

                    {columns.actions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setLocation(`/units?propertyId=${p.id}`)}
                            aria-label="View units"
                          >
                            <Home className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingProperty(p);
                              setShowAddPropertyModal(true);
                            }}
                            aria-label="Edit property"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                                deletePropertyMutation.mutate(p.id);
                              }
                            }}
                            disabled={deletePropertyMutation.isPending}
                            aria-label="Delete property"
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
                    <div className="text-slate-500">No properties match your filters.</div>
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

      {/* Add / Edit Property */}
      <AddPropertyModal
        open={showAddPropertyModal}
        onClose={() => {
          setShowAddPropertyModal(false);
          setEditingProperty(null);
        }}
        editProperty={editingProperty}
      />
    </div>
  );
}
