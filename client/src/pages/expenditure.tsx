import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  DollarSign,
  TrendingDown,
  Calendar,
  Building,
  Users,
  Wrench,
  Shield,
  Trash2,
  Edit,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { PropertyWithDetails } from "@/stubs/schema";

/* ---------- types + schema ---------- */
interface Expenditure {
  id: string;
  propertyId?: string;
  category: "caretaker" | "security" | "maintenance" | "utilities" | "management" | "other";
  amount: number;
  description: string;
  paymentDate: string;
  recipient: string;
  paymentMethod: string;
  recurring: boolean;
  recurringPeriod?: "monthly" | "quarterly" | "yearly";
  nextDueDate?: string;
  // optional denormalized joins
  property?: { name: string } | null;
}

const expenditureFormSchema = z.object({
  propertyId: z.string().optional(),
  category: z.enum(["caretaker", "security", "maintenance", "utilities", "management", "other"]),
  amount: z.number().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  recipient: z.string().min(1, "Recipient is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  recurring: z.boolean().default(false),
  recurringPeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  nextDueDate: z.string().optional(),
});
type ExpenditureFormData = z.infer<typeof expenditureFormSchema>;

/* ---------- helpers ---------- */
const PAGE_SIZE = 12;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const categoryIcon = {
  caretaker: Users,
  security: Shield,
  maintenance: Wrench,
  utilities: DollarSign,
  management: Building,
  other: DollarSign,
} as const;

const categoryBadgeClass = {
  caretaker: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  security: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  utilities: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  management: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  other: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
} as const;

export default function Expenditure() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // dialog state
  const [isCreating, setIsCreating] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expenditure | null>(null);

  // table state
  const [page, setPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<Record<
    "expense" | "property" | "category" | "amount" | "date" | "method" | "recurring" | "actions",
    boolean
  >>({
    expense: true,
    property: true,
    category: true,
    amount: true,
    date: true,
    method: true,
    recurring: true,
    actions: true,
  });

  // horizontal scroller
  const scrollerRef = useRef<HTMLDivElement>(null);
  const nudge = (dx: number) => scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  /* ---------- data ---------- */
  const { data: properties = [], isLoading: propertiesLoading } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
  });

  const { data: expenditures = [], isFetching: expLoading } = useQuery<Expenditure[]>({
    queryKey: ["/api/expenditures", selectedPropertyId, selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPropertyId && selectedPropertyId !== "all") params.set("propertyId", selectedPropertyId);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchTerm) params.set("q", searchTerm);
      const r = await apiRequest("GET", `/api/expenditures?${params.toString()}`);
      if (!r.ok) throw new Error(`Failed to load expenditures (${r.status})`);
      return r.json();
    },
    keepPreviousData: true,
    staleTime: 30_000,
  });

  /* ---------- analytics (on filtered data we got from the server) ---------- */
  const analytics = useMemo(() => {
    const totalExpenditure = expenditures.reduce((s, e) => s + (e.amount ?? 0), 0);
    const propertySpecific = expenditures.filter((e) => e.propertyId).reduce((s, e) => s + e.amount, 0);
    const generalExpenses = expenditures.filter((e) => !e.propertyId).reduce((s, e) => s + e.amount, 0);
    const recurringExpenses = expenditures.filter((e) => e.recurring).reduce((s, e) => s + e.amount, 0);
    const expenseCount = expenditures.length;
    return { totalExpenditure, propertySpecific, generalExpenses, recurringExpenses, expenseCount };
  }, [expenditures]);

  /* ---------- pagination + selection ---------- */
  const pageCount = Math.max(1, Math.ceil(expenditures.length / PAGE_SIZE));
  const current = expenditures.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allVisibleChecked = current.length > 0 && current.every((e) => checkedIds.has(e.id));
  const anyChecked = checkedIds.size > 0;

  const toggleCheckAllVisible = () =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) current.forEach((e) => next.delete(e.id));
      else current.forEach((e) => next.add(e.id));
      return next;
    });

  const toggleCheckOne = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ---------- form + mutation ---------- */
  const form = useForm<ExpenditureFormData>({
    resolver: zodResolver(expenditureFormSchema),
    defaultValues: {
      amount: 0,
      recurring: false,
      paymentDate: new Date().toISOString().split("T")[0],
    },
  });

  const expenditureMutation = useMutation({
    mutationFn: async (data: ExpenditureFormData) => {
      const endpoint = editingExpense ? `/api/expenditures/${editingExpense.id}` : "/api/expenditures";
      const method = editingExpense ? "PUT" : "POST";
      const r = await apiRequest(method, endpoint, data);
      if (!r.ok) {
        const msg = (await r.json().catch(() => ({}))).error || r.statusText || "Request failed";
        throw new Error(msg);
      }
      return r.json().catch(() => ({}));
    },
    onSuccess: () => {
      // refresh list; close dialog; reset
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/expenditures"] }),
      ]).then(() => {
        form.reset();
        setEditingExpense(null);
        setIsCreating(false);
        setPage(1);
        setCheckedIds(new Set());
        toast({ title: "Success", description: `Expenditure ${editingExpense ? "updated" : "added"} successfully!` });
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || `Failed to ${editingExpense ? "update" : "create"} expenditure`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenditureFormData) => expenditureMutation.mutate(data);

  if (propertiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="expenditure-page">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Expenditure Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track property expenses, recurring payments, and financial outflows
          </p>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog
          open={isCreating || !!editingExpense}
          onOpenChange={(open) => {
            setIsCreating(open);
            if (!open) {
              setEditingExpense(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700"
              data-testid="button-add-expenditure"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expenditure
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Edit" : "Add"} Expenditure</DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select onValueChange={(v) => form.setValue("category", v as any)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caretaker">Caretaker</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Property (Optional)</Label>
                  <Select onValueChange={(v) => form.setValue("propertyId", v === "none" ? undefined : v)}>
                    <SelectTrigger data-testid="select-property">
                      <SelectValue placeholder="General expense" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General Expense</SelectItem>
                      {properties?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("amount", { valueAsNumber: true })}
                    data-testid="input-amount"
                  />
                </div>
                <div>
                  <Label>Payment Date</Label>
                  <Input type="date" {...form.register("paymentDate")} data-testid="input-payment-date" />
                </div>
              </div>

              <div>
                <Label>Recipient</Label>
                <Input {...form.register("recipient")} placeholder="Enter recipient name" data-testid="input-recipient" />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea {...form.register("description")} placeholder="Enter expense description" data-testid="textarea-description" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Payment Method</Label>
                  <Select onValueChange={(v) => form.setValue("paymentMethod", v)}>
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recurring</Label>
                  <Select
                    onValueChange={(v) => {
                      if (v === "none") {
                        form.setValue("recurring", false);
                        form.setValue("recurringPeriod", undefined);
                      } else {
                        form.setValue("recurring", true);
                        form.setValue("recurringPeriod", v as any);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-recurring">
                      <SelectValue placeholder="One-time payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">One-time payment</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={expenditureMutation.isPending} className="bg-primary hover:bg-primary/90" data-testid="button-save-expenditure">
                  {expenditureMutation.isPending ? "Saving..." : editingExpense ? "Update" : "Add"} Expenditure
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingExpense(null);
                    form.reset();
                  }}
                  data-testid="button-cancel-expenditure"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-rose-200 dark:border-rose-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">Total Expenditure</p>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{formatCurrency(analytics.totalExpenditure)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-rose-500" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Property Specific</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(analytics.propertySpecific)}</p>
            </div>
            <Building className="w-8 h-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">General Expenses</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(analytics.generalExpenses)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">Recurring</p>
              <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{formatCurrency(analytics.recurringExpenses)}</p>
            </div>
            <Calendar className="w-8 h-8 text-violet-500" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Entries</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{analytics.expenseCount}</p>
            </div>
            <DollarSign className="w-8 h-8 text-slate-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters row */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50/60 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search description or recipient…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-testid="input-search-expenditure"
              />
            </div>

            <Select
              value={selectedPropertyId}
              onValueChange={(v) => {
                setSelectedPropertyId(v);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-property-filter"><SelectValue placeholder="All Expenses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                <SelectItem value="property">Property Specific Only</SelectItem>
                <SelectItem value="general">General Expenses Only</SelectItem>
                {properties?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedCategory}
              onValueChange={(v) => {
                setSelectedCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-category-filter"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="caretaker">Caretaker</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedPropertyId("all");
                setSelectedCategory("all");
                setSearchTerm("");
                setPage(1);
              }}
              className="w-full"
              data-testid="button-reset-filters"
            >
              Reset Filters
            </Button>

            {/* Column picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  Display Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  {(Object.keys(columns) as Array<keyof typeof columns>).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm capitalize">
                      <Checkbox
                        checked={columns[key]}
                        onCheckedChange={(v) => setColumns((c) => ({ ...c, [key]: Boolean(v) }))}
                      />
                      {String(key).replace(/([A-Z])/g, " $1")}
                    </label>
                  ))}
                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setColumns({
                          expense: true,
                          property: true,
                          category: true,
                          amount: true,
                          date: true,
                          method: true,
                          recurring: true,
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
                          expense: true,
                          property: true,
                          category: true,
                          amount: true,
                          date: true,
                          method: false,
                          recurring: false,
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
        <div className="relative">
          {/* side fades + nudge buttons */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/90 to-transparent dark:from-slate-950/80" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/90 to-transparent dark:from-slate-950/80" />
          <Button type="button" variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 z-10" onClick={() => nudge(-400)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 z-10" onClick={() => nudge(400)}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div ref={scrollerRef} className="overflow-x-auto scroll-smooth">
            <table className="min-w-[1100px] text-sm">
              <thead className="bg-white dark:bg-slate-900 sticky top-0">
                <tr className="border-y">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      aria-label="Select all"
                      checked={current.length > 0 && allVisibleChecked}
                      onChange={toggleCheckAllVisible}
                    />
                  </th>
                  {columns.expense && <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">Expense</th>}
                  {columns.property && <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">Property</th>}
                  {columns.category && <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">Category</th>}
                  {columns.amount && <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">Amount</th>}
                  {columns.date && <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">Payment Date</th>}
                  {columns.method && <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">Method</th>}
                  {columns.recurring && <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">Recurring</th>}
                  {columns.actions && <th className="px-4 py-3 text-right text-slate-500 font-medium whitespace-nowrap">Actions</th>}
                </tr>
              </thead>

              <tbody className="divide-y">
                {(expLoading ? [] : current).map((e) => {
                  const Icon = categoryIcon[e.category];
                  const pName = e.property?.name || (e.propertyId ? properties.find((p) => p.id === e.propertyId)?.name : undefined);

                  return (
                    <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checkedIds.has(e.id)}
                          onChange={() => toggleCheckOne(e.id)}
                          aria-label={`Select ${e.description}`}
                        />
                      </td>

                      {columns.expense && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-rose-200 dark:bg-rose-900/40 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-rose-700 dark:text-rose-300" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{e.description}</div>
                              <div className="text-xs text-slate-500">To: {e.recipient}</div>
                            </div>
                          </div>
                        </td>
                      )}

                      {columns.property && (
                        <td className="px-4 py-3">
                          {pName ? (
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <Building className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">{pName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">General</span>
                          )}
                        </td>
                      )}

                      {columns.category && (
                        <td className="px-4 py-3">
                          <Badge className={categoryBadgeClass[e.category]}>{e.category}</Badge>
                        </td>
                      )}

                      {columns.amount && <td className="px-4 py-3 font-medium text-rose-700 dark:text-rose-300">{formatCurrency(e.amount)}</td>}

                      {columns.date && <td className="px-4 py-3">{e.paymentDate}</td>}

                      {columns.method && <td className="px-4 py-3 capitalize">{e.paymentMethod.replace("_", " ")}</td>}

                      {columns.recurring && (
                        <td className="px-4 py-3">
                          {e.recurring ? (
                            <div className="text-xs">
                              <Badge variant="outline" className="mr-2">{e.recurringPeriod}</Badge>
                              {e.nextDueDate ? <span className="text-slate-500">Next: {e.nextDueDate}</span> : null}
                            </div>
                          ) : (
                            <span className="text-slate-500">One-time</span>
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
                              onClick={() => {
                                setEditingExpense(e);
                                // hydrate form
                                form.reset({
                                  propertyId: e.propertyId,
                                  category: e.category,
                                  amount: e.amount,
                                  description: e.description,
                                  paymentDate: e.paymentDate,
                                  recipient: e.recipient,
                                  paymentMethod: e.paymentMethod,
                                  recurring: e.recurring,
                                  recurringPeriod: e.recurringPeriod,
                                  nextDueDate: e.nextDueDate,
                                });
                                setIsCreating(true);
                              }}
                              aria-label="Edit expenditure"
                              data-testid={`button-edit-expenditure-${e.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" aria-label="Delete expenditure" disabled>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {!expLoading && current.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="text-slate-500">No expenditure records match your filters.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-300">Page {page} of {pageCount}</span>
            <Button variant="outline" size="icon" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
