// client/src/pages/invoices.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Send,
  DollarSign,
  Calendar,
  Home,
  FileText,
  Eye,
  FileDown,
  Link2,
  Users,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema } from "@/stubs/schema";
import { z } from "zod";
import type { Invoice } from "@/stubs/schema";

// ------------------------ Schemas & Types ------------------------

// Ensure status is in the schema (so it isn't dropped by resolver)
const invoiceFormSchema = insertInvoiceSchema
  .extend({
    tenantId: z.string().uuid({ message: "Select a tenant" }),
    unitId: z.string().uuid({ message: "Select a unit" }),
    amount: z.coerce.number().positive({ message: "Enter a valid amount" }),
    periodMonth: z.coerce.number().min(1).max(12),
    periodYear: z.coerce.number().min(2024),
    issueDate: z.string().min(1, "Pick an issue date"),
    dueDate: z.string().min(1, "Pick a due date"),
    description: z.string().optional(),
    status: z
      .enum(["draft", "sent", "paid", "overdue", "cancelled"])
      .default("draft"),
  })
  // keep only fields we actually submit to the API
  .pick({
    tenantId: true,
    unitId: true,
    amount: true,
    periodMonth: true,
    periodYear: true,
    issueDate: true,
    dueDate: true,
    description: true,
    status: true,
  });

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

const bulkInvoiceSchema = z.object({
  scope: z.enum(["all", "property", "tenants"]),
  propertyId: z.string().uuid().optional(),
  tenantIds: z.array(z.string().uuid()).optional(),
  periodMonth: z.coerce.number().min(1).max(12),
  periodYear: z.coerce.number().min(2024),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  amountMode: z.enum(["unit_rent", "custom", "add", "percent"]).default("unit_rent"),
  customAmount: z.coerce.number().positive().optional(),
  addAmount: z.coerce.number().optional(),
  percent: z.coerce.number().optional(),
  description: z.string().optional(),
  sendImmediately: z.boolean().default(false),
  skipIfExists: z.boolean().default(true),
});
type BulkInvoiceFormData = z.infer<typeof bulkInvoiceSchema>;

// ------------------------ Helpers ------------------------

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const monthName = (i: number) => new Date(0, i - 1).toLocaleString("default", { month: "long" });

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(num);
};

const DESCRIPTION_TEMPLATES = [
  { id: "rent-only", label: "Monthly Rent", text: "Monthly rent for {MONTH} {YEAR}" },
  { id: "rent-water", label: "Rent + Water", text: "Rent for {MONTH} {YEAR} plus water charges for Unit {UNIT}" },
  { id: "rent-late", label: "Rent (Late Fee)", text: "Monthly rent for {MONTH} {YEAR} including late fee" },
  { id: "deposit-topup", label: "Deposit Top-up", text: "Security deposit top-up for Unit {UNIT}" },
];

// ------------------------ Component ------------------------

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [applyPaymentId, setApplyPaymentId] = useState("");
  const [applyAmount, setApplyAmount] = useState<string>("");
  const [descTemplate, setDescTemplate] = useState<string>("");

  // Select & bulk-send
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Data
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ["/api/invoices"] });
  const { data: tenants = [] } = useQuery({ queryKey: ["/api/tenants"] });
  const { data: units = [] } = useQuery({ queryKey: ["/api/units"] });
  const { data: properties = [] } = useQuery({ queryKey: ["/api/properties"] });

  const filteredTenants = useMemo(
    () => tenants.filter((u: any) => u.role === "tenant"),
    [tenants]
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice: any) =>
        (invoice.tenant?.firstName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.tenant?.lastName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.tenant?.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.unit?.unitNumber ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.status ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.invoiceNumber ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [invoices, searchTerm]
  );

  const drafts = useMemo(
    () => filteredInvoices.filter((i: any) => i.status === "draft"),
    [filteredInvoices]
  );

  // ------------------------ Forms ------------------------

  const createForm = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: 0,
      status: "draft",
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      issueDate: todayISO(),
      dueDate: plusDaysISO(7),
      description: "",
    },
  });

  const editForm = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: 0,
      status: "draft",
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      issueDate: todayISO(),
      dueDate: plusDaysISO(7),
      description: "",
    },
  });

  const bulkForm = useForm<BulkInvoiceFormData>({
    resolver: zodResolver(bulkInvoiceSchema),
    defaultValues: {
      scope: "all",
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      amountMode: "unit_rent",
      sendImmediately: false,
      skipIfExists: true,
      description: "",
      issueDate: todayISO(),
      dueDate: plusDaysISO(7),
    },
  });

  // ------------------------ Helpers (forms) ------------------------

  const setAmountFromUnit = (form: typeof createForm | typeof editForm, unitId: string) => {
    const u = (units as any[]).find((x) => x.id === unitId);
    if (u?.monthlyRent != null) {
      form.setValue("amount", Number(u.monthlyRent));
    }
  };

  const autoPickUnitForTenant = (form: typeof createForm | typeof editForm, tenantId: string) => {
    const t = (filteredTenants as any[]).find((x) => x.id === tenantId);
    const unitId = t?.currentLease?.unitId ?? t?.unit?.id;
    if (unitId) {
      form.setValue("unitId", unitId, { shouldValidate: true });
      setAmountFromUnit(form, unitId);
    }
  };

  // ------------------------ Mutations ------------------------

  // Send types the API actually expects: date strings, numbers, and include status
  const toServerInvoicePayload = (data: InvoiceFormData) => ({
    tenantId: data.tenantId,
    unitId: data.unitId,
    amount: Number(data.amount),
    periodMonth: Number(data.periodMonth),
    periodYear: Number(data.periodYear),
    issueDate: data.issueDate || undefined, // keep as "YYYY-MM-DD"
    dueDate: data.dueDate || undefined,     // keep as "YYYY-MM-DD"
    description: data.description || "",
    status: data.status ?? "draft",
  });

  const refreshInvoices = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    await queryClient.refetchQueries({ queryKey: ["/api/invoices"], type: "active" });
  };

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) =>
      apiRequest("POST", "/api/invoices", toServerInvoicePayload(data)),
    onSuccess: async () => {
      await refreshInvoices();
      setIsCreateModalOpen(false);
      createForm.reset({
        tenantId: "",
        unitId: "",
        amount: 0,
        status: "draft",
        periodMonth: new Date().getMonth() + 1,
        periodYear: new Date().getFullYear(),
        issueDate: todayISO(),
        dueDate: plusDaysISO(7),
        description: "",
      });
      setDescTemplate("");
      toast({ title: "Success", description: "Invoice created successfully" });
    },
    onError: (error: any) => {
      const details = error?.errors || error?.response?.errors;
      const msg =
        details?.map((e: any) => e.message || `${e.path?.join(".")}: ${e.code}`).join(" • ") ||
        error?.message ||
        "Failed to create invoice";
      console.error("Create invoice error:", error);
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: InvoiceFormData & { id: string }) =>
      apiRequest("PUT", `/api/invoices/${id}`, toServerInvoicePayload(data as InvoiceFormData)),
    onSuccess: async () => {
      await refreshInvoices();
      setIsEditModalOpen(false);
      setSelectedInvoice(null);
      editForm.reset();
      toast({ title: "Success", description: "Invoice updated successfully" });
    },
    onError: (error: any) =>
      toast({
        title: "Error",
        description: error?.message || "Failed to update invoice",
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: async () => {
      await refreshInvoices();
      toast({ title: "Deleted", description: "Invoice deleted successfully" });
    },
    onError: (error: any) =>
      toast({ title: "Error", description: error?.message || "Failed to delete invoice", variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/invoices/${id}/send`),
    onSuccess: async () => {
      await refreshInvoices();
      toast({ title: "Sent", description: "Invoice sent successfully" });
    },
    onError: (error: any) =>
      toast({ title: "Error", description: error?.message || "Failed to send invoice", variant: "destructive" }),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (data: BulkInvoiceFormData) =>
      apiRequest("POST", "/api/invoices/bulk", {
        ...data,
        // keep dates as strings
        issueDate: data.issueDate || undefined,
        dueDate: data.dueDate || undefined,
      }),
    onSuccess: async (res: any) => {
      await refreshInvoices();
      setIsBulkModalOpen(false);
      bulkForm.reset({
        scope: "all",
        periodMonth: new Date().getMonth() + 1,
        periodYear: new Date().getFullYear(),
        amountMode: "unit_rent",
        sendImmediately: false,
        skipIfExists: true,
        description: "",
        issueDate: todayISO(),
        dueDate: plusDaysISO(7),
      });
      const created = Array.isArray(res?.created) ? res.created.length : undefined;
      toast({
        title: "Bulk invoicing complete",
        description: created != null ? `${created} invoice(s) created.` : "Invoices created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Bulk invoicing failed",
        variant: "destructive",
      });
    },
  });

  const bulkSendDraftsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => apiRequest("POST", `/api/invoices/${id}/send`))
      );
      const allFailed = results.every((r) => r.status === "rejected");
      if (allFailed) {
        throw new Error("Failed to send all draft invoices");
      }
    },
    onSuccess: async () => {
      await refreshInvoices();
      toast({ title: "Queued", description: "Draft invoices sent (where possible)." });
    },
    onError: (error: any) =>
      toast({
        title: "Error",
        description: error?.message || "Failed to send some invoices",
        variant: "destructive",
      }),
  });

  // ------------------------ UI Handlers ------------------------

  const openInvoicePdf = (id: string) =>
    window.open(`/api/invoices/${encodeURIComponent(id)}/pdf`, "_blank", "noopener");

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    editForm.reset({
      tenantId: (invoice as any).tenantId ?? (invoice as any).tenant?.id ?? "",
      unitId: (invoice as any).unitId ?? (invoice as any).unit?.id ?? "",
      amount: Number((invoice as any).amount ?? 0),
      status: (invoice as any).status ?? "draft",
      periodMonth: (invoice as any).periodMonth,
      periodYear: (invoice as any).periodYear,
      issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString().slice(0, 10) : todayISO(),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : plusDaysISO(7),
      description: (invoice as any).description ?? "",
      amountPaid: (invoice as any).amountPaid != null ? Number((invoice as any).amountPaid) : undefined,
      amountDue: (invoice as any).amountDue != null ? Number((invoice as any).amountDue) : undefined,
    } as any);
    setIsEditModalOpen(true);
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }
  };

  // ------------------------ Render ------------------------

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const createDisabled =
    !createForm.watch("tenantId") ||
    !createForm.watch("unitId") ||
    Number(createForm.watch("amount") || 0) <= 0;

  const bulkScope = bulkForm.watch("scope");
  const bulkMonth = bulkForm.watch("periodMonth");
  const bulkYear = bulkForm.watch("periodYear");
  const bulkDesc = bulkForm.watch("description") || "";
  const bulkSummary = (() => {
    let target = "All active leases";
    if (bulkScope === "property") {
      const pid = bulkForm.watch("propertyId");
      const p = (properties as any[])?.find((x) => x.id === pid);
      target = p ? `Property: ${p.name}` : "Pick a property";
    }
    if (bulkScope === "tenants") {
      const ids = bulkForm.watch("tenantIds") || [];
      target = `Tenants selected: ${ids.length}`;
    }
    return `${target} • ${monthName(bulkMonth)} ${bulkYear}${bulkDesc ? " • " + bulkDesc : ""}`;
  })();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoice Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Create, manage, send, and export invoices</p>
        </div>

        <div className="flex gap-2">
          {/* Bulk Invoicing */}
          <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                className="shadow"
                data-testid="button-bulk-invoice"
                title="Bulk invoice tenants"
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Invoicing</DialogTitle>
                <DialogDescription>
                  Create multiple invoices at once (skips duplicates for same unit & period).
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md bg-muted px-3 py-2 text-sm mb-3">{bulkSummary}</div>

              <Form {...bulkForm}>
                <form
                  className="space-y-4"
                  onSubmit={bulkForm.handleSubmit((data) => {
                    if (data.scope === "property" && !data.propertyId) {
                      return toast({
                        title: "Pick a property",
                        description: "Select a property for this bulk run.",
                        variant: "destructive",
                      });
                    }
                    if (data.scope === "tenants" && (!data.tenantIds || data.tenantIds.length === 0)) {
                      return toast({
                        title: "Pick tenants",
                        description: "Choose at least one tenant.",
                        variant: "destructive",
                      });
                    }
                    if (data.amountMode === "custom" && !data.customAmount) {
                      return toast({
                        title: "Missing amount",
                        description: "Provide a custom amount or choose 'Use unit rent'.",
                        variant: "destructive",
                      });
                    }
                    bulkCreateMutation.mutate({
                      ...data,
                      issueDate: data.issueDate || undefined,
                      dueDate: data.dueDate || undefined,
                    });
                  })}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={bulkForm.control}
                      name="scope"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scope</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="bulk-scope">
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All active leases</SelectItem>
                              <SelectItem value="property">By property</SelectItem>
                              <SelectItem value="tenants">Pick tenants</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bulkForm.control}
                      name="periodMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={String(field.value ?? "")}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="bulk-month">
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {monthName(i + 1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bulkForm.control}
                      name="periodYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Year" {...field} data-testid="bulk-year" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conditional: property picker */}
                  {bulkScope === "property" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={bulkForm.control}
                        name="propertyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="bulk-property">
                                  <SelectValue placeholder="Select property" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(properties as any[]).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Conditional: choose tenants */}
                  {bulkScope === "tenants" && (
                    <div className="border rounded-md p-3 max-h-56 overflow-auto">
                      <div className="text-sm font-medium mb-2">Pick tenants</div>
                      <div className="grid md:grid-cols-2 gap-2">
                        {filteredTenants.map((t: any) => {
                          const chosen = bulkForm.watch("tenantIds") || [];
                          const checked = chosen.includes(t.id);
                          return (
                            <label key={t.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = new Set(chosen);
                                  if (e.target.checked) next.add(t.id);
                                  else next.delete(t.id);
                                  bulkForm.setValue("tenantIds", Array.from(next));
                                }}
                              />
                              <span>
                                {t.firstName} {t.lastName} — {t.email}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Amount strategy */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={bulkForm.control}
                      name="amountMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="bulk-amount-mode">
                                <SelectValue placeholder="Pick mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unit_rent">Use unit monthly rent</SelectItem>
                              <SelectItem value="custom">Custom fixed amount</SelectItem>
                              <SelectItem value="add">Unit rent + add/subtract</SelectItem>
                              <SelectItem value="percent">Unit rent +/- percent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {bulkForm.watch("amountMode") === "custom" && (
                      <FormField
                        control={bulkForm.control}
                        name="customAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Amount (KES)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="e.g. 25000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {bulkForm.watch("amountMode") === "add" && (
                      <FormField
                        control={bulkForm.control}
                        name="addAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Add/Subtract (KES)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="e.g. 1500 or -500" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {bulkForm.watch("amountMode") === "percent" && (
                      <FormField
                        control={bulkForm.control}
                        name="percent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Percent (+/-)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="e.g. 10 or -5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Dates & flags */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={bulkForm.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="bulk-issue" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bulkForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="bulk-due" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bulkForm.control}
                      name="sendImmediately"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block">Send Immediately</FormLabel>
                          <div className="h-10 flex items-center">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bulkForm.control}
                      name="skipIfExists"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block">Skip Existing (same unit & period)</FormLabel>
                          <div className="h-10 flex items-center">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={bulkForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Rent invoice + water charge"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBulkModalOpen(false)}
                      data-testid="bulk-cancel"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={bulkCreateMutation.isPending} data-testid="bulk-submit">
                      {bulkCreateMutation.isPending ? "Creating..." : "Create Invoices"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Selection toggle */}
          <Button
            variant={selectMode ? "secondary" : "outline"}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds([]);
            }}
          >
            {selectMode ? "Done Selecting" : "Select Invoices"}
          </Button>

          {/* Send selected */}
          <Button
            variant="default"
            disabled={!selectMode || selectedIds.length === 0 || bulkSendDraftsMutation.isPending}
            onClick={() => bulkSendDraftsMutation.mutate(selectedIds)}
            title={selectMode ? "Send selected draft invoices via SMS" : "Enable selection first"}
          >
            <Send className="w-4 h-4 mr-2" />
            {bulkSendDraftsMutation.isPending
              ? "Sending..."
              : `Send Selected${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
          </Button>

          {/* Send all drafts */}
          <Button
            variant="outline"
            onClick={() => drafts.length && bulkSendDraftsMutation.mutate(drafts.map((d: any) => d.id))}
            disabled={drafts.length === 0 || bulkSendDraftsMutation.isPending}
            title={drafts.length ? "Send all draft invoices via SMS" : "No drafts to send"}
          >
            <Send className="w-4 h-4 mr-2" />
            {bulkSendDraftsMutation.isPending
              ? "Sending..."
              : `Send All Drafts${drafts.length ? ` (${drafts.length})` : ""}`}
          </Button>

          {/* Create single invoice */}
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                data-testid="button-create-invoice"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Generate a new invoice for a tenant&apos;s rent payment</DialogDescription>
              </DialogHeader>

              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit((data) => {
                    if (createDisabled) {
                      return toast({
                        title: "Missing data",
                        description: "Select a tenant & unit and enter a valid amount.",
                        variant: "destructive",
                      });
                    }
                    createMutation.mutate(data);
                  })}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="tenantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              field.onChange(v);
                              autoPickUnitForTenant(createForm, v);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-tenant">
                                <SelectValue placeholder="Select tenant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredTenants.map((tenant: any) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.firstName} {tenant.lastName} - {tenant.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              field.onChange(v);
                              setAmountFromUnit(createForm, v);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-unit">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {units.map((unit: any) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  Unit {unit.unitNumber} — {formatCurrency(unit.monthlyRent as any)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (KES)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Enter amount"
                              {...field}
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="periodMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period Month</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={String(field.value ?? "")}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-month">
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {monthName(i + 1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="periodYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period Year</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Year" {...field} data-testid="input-year" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-issue-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Description + Templates */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                    <div className="md:col-span-3">
                      <FormField
                        control={createForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Invoice description..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Templates</FormLabel>
                      <Select
                        value={descTemplate}
                        onValueChange={(val) => {
                          setDescTemplate(val);
                          const tpl = DESCRIPTION_TEMPLATES.find((t) => t.id === val);
                          if (tpl) {
                            const text = tpl.text
                              .replace("{MONTH}", monthName(createForm.getValues("periodMonth")))
                              .replace("{YEAR}", String(createForm.getValues("periodYear")))
                              .replace("{UNIT}", (() => {
                                const uid = createForm.getValues("unitId");
                                const u = (units as any[]).find((x) => x.id === uid);
                                return u?.unitNumber ?? "";
                              })());
                            createForm.setValue("description", text);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DESCRIPTION_TEMPLATES.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <span className="inline-flex items-center">
                                <Wand2 className="w-3 h-3 mr-2" />
                                {t.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (!descTemplate) return;
                          const tpl = DESCRIPTION_TEMPLATES.find((t) => t.id === descTemplate);
                          if (tpl) {
                            const text = tpl.text
                              .replace("{MONTH}", monthName(createForm.getValues("periodMonth")))
                              .replace("{YEAR}", String(createForm.getValues("periodYear")))
                              .replace("{UNIT}", (() => {
                                const uid = createForm.getValues("unitId");
                                const u = (units as any[]).find((x) => x.id === uid);
                                return u?.unitNumber ?? "";
                              })());
                            createForm.setValue("description", text);
                          }
                        }}
                      >
                        Refresh Template
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createDisabled || createMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createMutation.isPending ? "Creating..." : "Create Invoice"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & stat */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search invoices by tenant, unit, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-invoices"
          />
        </div>

        <div className="flex gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <div className="text-sm">
                <div className="font-semibold" data-testid="text-total-invoices">
                  {filteredInvoices.length}
                </div>
                <div className="text-gray-500">Total Invoices</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Invoices grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredInvoices.map((invoice: any) => (
          <Card
            key={invoice.id}
            className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500"
            data-testid={`card-invoice-${invoice.id}`}
          >
            <div className="p-4 pb-0">
              <div className="flex items-center gap-2">
                {selectMode ? (
                  <input
                    type="checkbox"
                    aria-label="Select invoice"
                    checked={selectedIds.includes(invoice.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) =>
                        e.target.checked ? [...prev, invoice.id] : prev.filter((id) => id !== invoice.id)
                      );
                    }}
                  />
                ) : null}
                <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Home className="w-3 h-3" />
                  <span>Unit {invoice.unit?.unitNumber}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {invoice.periodMonth}/{invoice.periodYear}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-lg" data-testid={`text-amount-${invoice.id}`}>
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
              </div>

              {invoice.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {invoice.description}
                </p>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(invoice)}
                    data-testid={`button-view-${invoice.id}`}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(invoice)}
                    data-testid={`button-edit-${invoice.id}`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(invoice.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${invoice.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openInvoicePdf(invoice.id)}
                    data-testid={`button-generate-pdf-${invoice.id}`}
                    title="Generate Invoice PDF"
                  >
                    <FileDown className="w-3 h-3 mr-1" />
                    PDF
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setIsApplyModalOpen(true);
                    }}
                    data-testid={`button-apply-${invoice.id}`}
                    title="Apply a payment to this invoice"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Apply Payment
                  </Button>

                  {invoice.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => sendMutation.mutate(invoice.id)}
                      disabled={sendMutation.isPending}
                      data-testid={`button-send-${invoice.id}`}
                      title="Send invoice"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Send
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? "Try adjusting your search criteria" : "Create your first invoice to get started"}
          </p>
        </div>
      )}

      {/* Edit modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>Update invoice details</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                updateMutation.mutate({ ...data, id: selectedInvoice!.id })
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          autoPickUnitForTenant(editForm, v);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredTenants.map((tenant: any) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.firstName} {tenant.lastName} - {tenant.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          setAmountFromUnit(editForm, v);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit: any) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} — {formatCurrency(unit.monthlyRent as any)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (KES)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Enter amount" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid (KES)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Amount paid" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Invoice description..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Invoice"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>View complete invoice information</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">
                    Invoice Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Invoice Number:</span>
                      <p className="font-medium">
                        {selectedInvoice.invoiceNumber || `INV-${selectedInvoice.id.slice(0, 8)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge className={getStatusColor(selectedInvoice.status)}>
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Period:</span>
                      <p className="font-medium">
                        {selectedInvoice.periodMonth}/{selectedInvoice.periodYear}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">
                    Payment Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Amount:</span>
                      <p className="font-medium text-lg">{formatCurrency(selectedInvoice.amount)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Amount Due:</span>
                      <p className="font-medium">
                        {formatCurrency((selectedInvoice as any).amountDue ?? selectedInvoice.amount)}
                      </p>
                    </div>
                    {(selectedInvoice as any).amountPaid != null && (
                      <div>
                        <span className="text-sm text-gray-600">Amount Paid:</span>
                        <p className="font-medium text-green-600">
                          {formatCurrency((selectedInvoice as any).amountPaid)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Dates</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Issue Date:</span>
                      <p className="font-medium">
                        {selectedInvoice.issueDate
                          ? new Date(selectedInvoice.issueDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Due Date:</span>
                      <p className="font-medium">
                        {selectedInvoice.dueDate
                          ? new Date(selectedInvoice.dueDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">
                    Tenant & Unit
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Tenant:</span>
                      <p className="font-medium">
                        {(selectedInvoice as any).tenant?.firstName}{" "}
                        {(selectedInvoice as any).tenant?.lastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Unit:</span>
                      <p className="font-medium">Unit {(selectedInvoice as any).unit?.unitNumber}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedInvoice.description && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">
                    Description
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedInvoice.description}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Payment modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Payment to Invoice</DialogTitle>
            <DialogDescription>Link an existing payment (partial or full).</DialogDescription>
          </DialogHeader>

        <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Payment ID</label>
              <Input
                placeholder="paste payment.id"
                value={applyPaymentId}
                onChange={(e) => setApplyPaymentId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (optional)</label>
              <Input
                type="number"
                placeholder="leave empty to use full payment amount"
                value={applyAmount}
                onChange={(e) => setApplyAmount(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!selectedInvoice || !applyPaymentId}
                onClick={async () => {
                  try {
                    await apiRequest("POST", `/api/invoices/${selectedInvoice!.id}/apply-payment`, {
                      paymentId: applyPaymentId.trim(),
                      amount: applyAmount ? Number(applyAmount) : undefined,
                    });
                    setIsApplyModalOpen(false);
                    setApplyPaymentId("");
                    setApplyAmount("");
                    await refreshInvoices();
                    toast({ title: "Applied", description: "Payment applied to invoice." });
                  } catch (e: any) {
                    toast({
                      title: "Error",
                      description: e?.message ?? "Failed to apply payment",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
