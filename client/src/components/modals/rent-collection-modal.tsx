// client/src/components/modals/rent-collection-modal.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  DollarSign,
  Smartphone,
  CreditCard,
  Building,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

import type {
  TenantWithDetails,
  PropertyWithDetails,
  UnitWithDetails,
} from "@/stubs/schema";

/* ------------------------------- Schemas ------------------------------- */

const manualPaymentSchema = z.object({
  propertyId: z.string().min(1, "Please select a property"),
  unitId: z.string().min(1, "Please select a unit"),
  tenantId: z.string().min(1, "Please select a tenant"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  paymentMethod: z.enum(["cash", "check", "bank_transfer", "credit_card", "mpesa", "online"]),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type ManualPaymentForm = z.infer<typeof manualPaymentSchema>;

/** KCB (Sandbox) – placeholder schema */
const kcbSandboxSchema = z.object({
  propertyId: z.string().min(1, "Please select a property"),
  unitId: z.string().min(1, "Please select a unit"),
  tenantId: z.string().min(1, "Please select a tenant"),
  amount: z.coerce.number().min(1, "Amount must be at least KSh 1"),
  /** optional metadata for reconciliation */
  narrative: z.string().optional(),
});

type KCBSandboxForm = z.infer<typeof kcbSandboxSchema>;

type PaymentStatus = {
  id: string;
  status: "pending" | "paid" | "failed";
  message: string;
  amount: number;
  msisdn?: string | null;
  timestamp: string;
};

interface RentCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ----------------------------- Component ------------------------------- */

export function RentCollectionModal({ open, onOpenChange }: RentCollectionModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"manual" | "kcb">("manual");

  // Status UI for KCB sandbox flow
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [polling, setPolling] = useState(false);

  /* ------------------------------- Data -------------------------------- */

  const { data: properties = [] } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
  });

  const { data: units = [] } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  const { data: tenants = [] } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/tenants"],
  });

  /* ------------------------------- Forms ------------------------------- */

  const manualForm = useForm<ManualPaymentForm>({
    resolver: zodResolver(manualPaymentSchema),
    defaultValues: {
      propertyId: "",
      unitId: "",
      tenantId: "",
      amount: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      description: "Rent Payment",
      notes: "",
    },
  });

  const kcbForm = useForm<KCBSandboxForm>({
    resolver: zodResolver(kcbSandboxSchema),
    defaultValues: {
      propertyId: "",
      unitId: "",
      tenantId: "",
      amount: 0,
      narrative: "Rent Payment (KCB Sandbox)",
    },
  });

  /* --------------------------- Derived options ------------------------- */

  // Selected values across tabs (sync when switching)
  const selectedPropertyId = manualForm.watch("propertyId") || kcbForm.watch("propertyId");
  const selectedUnitId = manualForm.watch("unitId") || kcbForm.watch("unitId");
  const selectedTenantId = manualForm.watch("tenantId") || kcbForm.watch("tenantId");

  const filteredUnits = useMemo(
    () => units.filter((u) => !selectedPropertyId || u.propertyId === selectedPropertyId),
    [units, selectedPropertyId]
  );

  // NOTE: in your data shape, a tenant's unit is `tenant.unit?.id`
  const filteredTenants = useMemo(
    () =>
      tenants.filter((t) => {
        if (!selectedUnitId) return true;
        return t.unit?.id === selectedUnitId;
      }),
    [tenants, selectedUnitId]
  );

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId),
    [tenants, selectedTenantId]
  );

  // Auto-populate amount (monthlyRent) and keep KCB/Manual in sync
  useEffect(() => {
    const monthly = Number(selectedTenant?.currentLease?.monthlyRent ?? 0);
    if (monthly > 0) {
      manualForm.setValue("amount", monthly);
      kcbForm.setValue("amount", monthly);
    }
  }, [selectedTenant, manualForm, kcbForm]);

  // Switch tabs and sync shared fields
  const handleTabChange = (value: string) => {
    if (value === "kcb" && activeTab === "manual") {
      const v = manualForm.getValues();
      kcbForm.setValue("propertyId", v.propertyId);
      kcbForm.setValue("unitId", v.unitId);
      kcbForm.setValue("tenantId", v.tenantId);
      kcbForm.setValue("amount", v.amount);
    } else if (value === "manual" && activeTab === "kcb") {
      const v = kcbForm.getValues();
      manualForm.setValue("propertyId", v.propertyId);
      manualForm.setValue("unitId", v.unitId);
      manualForm.setValue("tenantId", v.tenantId);
      manualForm.setValue("amount", v.amount);
    }
    setActiveTab(value as "manual" | "kcb");
  };

  /* ----------------------------- Mutations ----------------------------- */

  // Manual entry → posts a real payment (paid/posted)
  const recordPayment = useMutation({
    mutationFn: async (data: ManualPaymentForm) => {
      // Map to your backend shape for /api/payments
      const payload = {
        tenantId: data.tenantId,
        unitId: data.unitId,
        amount: data.amount,
        method: data.paymentMethod,
        source: "manual",
        description: data.description || "Rent Payment",
        paidAt: data.paymentDate,
        dueDate: data.dueDate,
        notes: data.notes,
      };
      return apiRequest("POST", "/api/payments", payload);
    },
    onSuccess: async () => {
      toast({ title: "Payment recorded", description: "Rent payment saved successfully." });
      await queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      manualForm.reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to record payment",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // KCB Sandbox initiate (placeholder) → creates a pending payment and returns a paymentId we can poll
  const initiateKcb = useMutation({
    mutationFn: async (data: KCBSandboxForm) => {
      const payload = {
        tenantId: data.tenantId,
        unitId: data.unitId,
        amount: data.amount,
        narrative: data.narrative ?? "Rent Payment (KCB Sandbox)",
      };
      // Placeholder endpoints — implement server-side later
      return apiRequest("POST", "/api/payments/kcb/initiate", payload);
    },
    onSuccess: async (resp: Response) => {
      const result = await resp.json().catch(() => ({}));
      if (!result?.paymentId) {
        toast({
          title: "Sandbox not ready",
          description: "Backend placeholder responded without a paymentId.",
          variant: "destructive",
        });
        return;
      }

      setPaymentStatus({
        id: result.paymentId,
        status: "pending",
        message: "Waiting for bank confirmation…",
        amount: kcbForm.getValues("amount"),
        msisdn: null,
        timestamp: new Date().toISOString(),
      });
      setPolling(true);
      toast({ title: "KCB (sandbox) initiated", description: "Polling for status…" });
      startKcbPolling(result.paymentId);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to initiate KCB (sandbox)",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const startKcbPolling = (paymentId: string) => {
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const resp = await apiRequest("GET", `/api/payments/kcb/status/${encodeURIComponent(paymentId)}`);
        const data = await resp.json().catch(() => ({}));
        const st: "pending" | "paid" | "failed" = data?.status ?? "pending";

        setPaymentStatus((prev) =>
          prev
            ? {
                ...prev,
                status: st,
                message:
                  st === "paid"
                    ? "Payment completed successfully!"
                    : st === "failed"
                    ? "Payment failed/cancelled"
                    : "Waiting for bank confirmation…",
              }
            : null
        );

        if (st === "paid") {
          setPolling(false);
          await queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          // brief success pause
          setTimeout(() => handleClose(), 1200);
          return;
        }
        if (st === "failed") {
          setPolling(false);
          return;
        }
      } catch (e) {
        // keep polling quietly
      }
      if (active) window.setTimeout(tick, 3000);
    };

    tick();

    // safety stop after 5 minutes
    window.setTimeout(() => {
      active = false;
      setPolling(false);
    }, 5 * 60 * 1000);
  };

  /* ------------------------------- Helpers ------------------------------ */

  const formatKES = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(
      Number(n || 0)
    );

  const handleClose = () => {
    manualForm.reset();
    kcbForm.reset();
    setPaymentStatus(null);
    setPolling(false);
    setActiveTab("manual");
    onOpenChange(false);
  };

  /* -------------------------------- UI --------------------------------- */

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Collect Rent Payment
          </DialogTitle>
        </DialogHeader>

        {paymentStatus ? (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {paymentStatus.status === "pending" && <Clock className="h-5 w-5 text-amber-500" />}
                {paymentStatus.status === "paid" && <CheckCircle className="h-5 w-5 text-green-600" />}
                {paymentStatus.status === "failed" && <AlertCircle className="h-5 w-5 text-red-600" />}
                Bank Paybill (KCB – Sandbox)
              </CardTitle>
              <CardDescription>
                Amount: {formatKES(paymentStatus.amount)} • Ref: {paymentStatus.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      paymentStatus.status === "paid"
                        ? "default"
                        : paymentStatus.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                    className="uppercase"
                  >
                    {paymentStatus.status}
                  </Badge>
                  <p className="font-medium">{paymentStatus.message}</p>
                </div>

                {polling && paymentStatus.status === "pending" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for sandbox confirmation…
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleClose} className="flex-1" data-testid="button-close-status">
                    Close
                  </Button>
                  {paymentStatus.status === "failed" && (
                    <Button
                      onClick={() => {
                        setPaymentStatus(null);
                        setActiveTab("kcb");
                      }}
                      className="flex-1"
                      data-testid="button-retry-kcb"
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="kcb" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Bank Paybill (KCB – Sandbox)
              </TabsTrigger>
            </TabsList>

            {/* -------------------------- Manual Entry -------------------------- */}
            <TabsContent value="manual">
              <Form {...manualForm}>
                <form
                  onSubmit={manualForm.handleSubmit((data) => recordPayment.mutate(data))}
                  className="space-y-6"
                >
                  {/* Property */}
                  <FormField
                    control={manualForm.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Property
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-manual">
                              <SelectValue placeholder="Select a property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties.map((p) => (
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

                  {/* Unit */}
                  <FormField
                    control={manualForm.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit-manual">
                              <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredUnits.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.unitNumber || `Unit ${u.id.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tenant */}
                  <FormField
                    control={manualForm.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Tenant
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tenant-manual">
                              <SelectValue placeholder="Select a tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTenants.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.firstName} {t.lastName}
                                {t.phone && <span className="text-muted-foreground ml-2">({t.phone})</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={manualForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (KES)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              data-testid="input-amount-manual"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manualForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="mpesa">M-Pesa</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={manualForm.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Payment Date
                          </FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-payment-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={manualForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-due-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={manualForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Rent Payment" data-testid="input-description-manual" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={manualForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes about this payment…"
                            rows={3}
                            data-testid="textarea-notes-manual"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                      data-testid="button-cancel-manual"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={recordPayment.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      data-testid="button-record-payment"
                    >
                      {recordPayment.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Recording…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Record Payment
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* --------------------------- KCB Sandbox -------------------------- */}
            <TabsContent value="kcb">
              <Form {...kcbForm}>
                <form
                  onSubmit={kcbForm.handleSubmit((data) => initiateKcb.mutate(data))}
                  className="space-y-6"
                >
                  {/* Property */}
                  <FormField
                    control={kcbForm.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Property
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-kcb">
                              <SelectValue placeholder="Select a property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties.map((p) => (
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

                  {/* Unit */}
                  <FormField
                    control={kcbForm.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit-kcb">
                              <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredUnits.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.unitNumber || `Unit ${u.id.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tenant */}
                  <FormField
                    control={kcbForm.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Tenant
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tenant-kcb">
                              <SelectValue placeholder="Select a tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTenants.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.firstName} {t.lastName}
                                {t.phone && <span className="text-muted-foreground ml-2">({t.phone})</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Amount + Narrative */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={kcbForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (KES)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="1000"
                              data-testid="input-amount-kcb"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={kcbForm.control}
                      name="narrative"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Narrative</FormLabel>
                          <FormControl>
                            <Input placeholder="Rent Payment (KCB Sandbox)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                      <Smartphone className="w-4 h-4" />
                      <span className="font-medium">KCB Paybill (Sandbox)</span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      This is a sandbox placeholder. On initiate, a <code>paymentId</code> is returned and we poll
                      for <em>paid / failed</em>. Connect it to your bank’s sandbox credentials server-side.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                      data-testid="button-cancel-kcb"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={initiateKcb.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-initiate-kcb"
                    >
                      {initiateKcb.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Initiating…
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4 mr-2" />
                          Initiate (Sandbox)
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
