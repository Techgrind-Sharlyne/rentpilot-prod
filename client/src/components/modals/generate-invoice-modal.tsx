import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

const invoiceSchema = z.object({
  tenantId: z.string().min(1, "Tenant selection is required"),
  unitId: z.string().min(1, "Unit is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().min(1, "Description is required"),
  invoiceType: z.enum(["rent", "late_fee", "utilities", "maintenance", "other"]),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface GenerateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateInvoiceModal({ open, onOpenChange }: GenerateInvoiceModalProps) {
  const { toast } = useToast();

  const { data: tenants } = useQuery<TenantsResponse>({
    queryKey: ["/api/tenants"],
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: 0,
      dueDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 30); // 30 days from now
        return date.toISOString().split('T')[0];
      })(),
      description: "",
      invoiceType: "rent",
    },
  });

  const selectedTenantId = form.watch("tenantId");
  const invoiceType = form.watch("invoiceType");
  const selectedTenant = tenants?.find((t: any) => t.id === selectedTenantId);

  // Auto-fill unit, amount, and description when tenant or type is selected
  useEffect(() => {
    if (selectedTenant) {
      form.setValue("unitId", selectedTenant.unit?.id || "");
      
      if (invoiceType === "rent") {
        form.setValue("amount", Number(selectedTenant.currentLease?.monthlyRent || 0));
        form.setValue("description", `Monthly rent for ${selectedTenant.unit?.unitNumber}`);
      }
    }
  }, [selectedTenant, invoiceType, form]);

  useEffect(() => {
    if (invoiceType && selectedTenant) {
      switch (invoiceType) {
        case "rent":
          form.setValue("amount", Number(selectedTenant.currentLease?.monthlyRent || 0));
          form.setValue("description", `Monthly rent for ${selectedTenant.unit?.unitNumber}`);
          break;
        case "late_fee":
          form.setValue("amount", 50); // Default late fee
          form.setValue("description", `Late fee for ${selectedTenant.unit?.unitNumber}`);
          break;
        case "utilities":
          form.setValue("amount", 100); // Default utility charge
          form.setValue("description", `Utility charges for ${selectedTenant.unit?.unitNumber}`);
          break;
        case "maintenance":
          form.setValue("amount", 0);
          form.setValue("description", `Maintenance charges for ${selectedTenant.unit?.unitNumber}`);
          break;
        case "other":
          form.setValue("amount", 0);
          form.setValue("description", `Additional charges for ${selectedTenant.unit?.unitNumber}`);
          break;
      }
    }
  }, [invoiceType, selectedTenant, form]);

  const generateInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const payload = {
        tenantId: data.tenantId,
        unitId: data.unitId,
        amount: data.amount,
        dueDate: new Date(data.dueDate).toISOString(),
        description: data.description,
        status: "sent",
      };
      await apiRequest("POST", "/api/invoices", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice generated successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    generateInvoiceMutation.mutate(data);
  };

  // Filter tenants with active leases
  const activeTenantsWithLeases = tenants?.filter((tenant: any) => 
    tenant.currentLease && tenant.unit
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for rent and other charges for a tenant. The invoice will be automatically calculated based on the lease terms.
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
                      <SelectTrigger data-testid="invoice-tenant-select">
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

            <FormField
              control={form.control}
              name="invoiceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="invoice-type-select">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="rent">Monthly Rent</SelectItem>
                      <SelectItem value="late_fee">Late Fee</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                        data-testid="invoice-amount-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        data-testid="invoice-due-date-input"
                      />
                    </FormControl>
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
                    <Textarea 
                      placeholder="Invoice description" 
                      rows={3} 
                      {...field} 
                      data-testid="invoice-description-input"
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
                data-testid="cancel-invoice-button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={generateInvoiceMutation.isPending}
                data-testid="submit-invoice-button"
              >
                {generateInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
