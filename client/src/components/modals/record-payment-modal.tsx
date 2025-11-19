import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TenantsResponse } from "@/types/api";

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant selection is required"),
  unitId: z.string().min(1, "Unit is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  paymentMethod: z.enum(["cash", "check", "bank_transfer", "credit_card", "mpesa", "online"]),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordPaymentModal({ open, onOpenChange }: RecordPaymentModalProps) {
  const { toast } = useToast();

  const { data: tenants } = useQuery<TenantsResponse>({
    queryKey: ["/api/tenants"],
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      paymentMethod: "cash",
      description: "Rent Payment",
      notes: "",
    },
  });

  const selectedTenantId = form.watch("tenantId");
  const selectedTenant = tenants?.find((t: any) => t.id === selectedTenantId);

  // Auto-fill unit and amount when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      form.setValue("unitId", selectedTenant.unit?.id || "");
      form.setValue("amount", Number(selectedTenant.currentLease?.monthlyRent || 0));
    }
  }, [selectedTenant, form]);

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const payload = {
        ...data,
        paymentDate: new Date(data.paymentDate).toISOString(),
        dueDate: new Date(data.dueDate).toISOString(),
        status: "paid",
      };
      await apiRequest("POST", "/api/payments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-payments"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    recordPaymentMutation.mutate(data);
  };

  // Filter tenants with active leases
  const activeTenantsWithLeases = tenants?.filter((tenant: any) => 
    tenant.currentLease && tenant.unit
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a manual payment received from a tenant. This will update their payment history and reduce any outstanding balances.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="payment-tenant-select">
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeTenantsWithLeases.length > 0 ? (
                        activeTenantsWithLeases.map((tenant: any) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.firstName} {tenant.lastName} - {tenant.unit?.unitNumber}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No active tenants found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                        data-testid="payment-amount-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="payment-date-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="payment-due-date-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="payment-method-select">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                        <SelectItem value="online">Online Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Rent Payment" 
                      {...field} 
                      data-testid="payment-description-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes" 
                      rows={2} 
                      {...field} 
                      data-testid="payment-notes-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="cancel-payment-button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={recordPaymentMutation.isPending}
                className="bg-green-600 text-white hover:bg-green-700"
                data-testid="submit-payment-button"
              >
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
