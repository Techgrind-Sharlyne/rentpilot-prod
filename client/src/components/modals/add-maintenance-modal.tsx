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
import type { UnitsResponse, TenantsResponse } from "@/types/api";

const maintenanceSchema = z.object({
  unitId: z.string().min(1, "Unit selection is required"),
  tenantId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["plumbing", "electrical", "hvac", "appliance", "structural", "other"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  estimatedCost: z.coerce.number().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface AddMaintenanceModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddMaintenanceModal({ open, onClose }: AddMaintenanceModalProps) {
  const { toast } = useToast();

  const { data: units } = useQuery<UnitsResponse>({
    queryKey: ["/api/units"],
  });

  const { data: tenants } = useQuery<TenantsResponse>({
    queryKey: ["/api/tenants"],
  });

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      unitId: "",
      tenantId: "none",
      title: "",
      description: "",
      category: "other",
      priority: "normal",
      estimatedCost: undefined,
    },
  });

  const selectedUnitId = form.watch("unitId");
  const selectedUnit = units?.find((u: any) => u.id === selectedUnitId);

  // Auto-fill tenant when unit is selected
  useEffect(() => {
    if (selectedUnit) {
      const unitTenant = tenants?.find((t: any) => t.unit?.id === selectedUnitId);
      if (unitTenant) {
        form.setValue("tenantId", unitTenant.id);
      } else {
        form.setValue("tenantId", "none");
      }
    }
  }, [selectedUnit, selectedUnitId, tenants, form]);

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      const payload = {
        ...data,
        tenantId: data.tenantId === "none" ? undefined : data.tenantId, // Convert "none" to undefined
      };
      await apiRequest("POST", "/api/maintenance-requests", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Maintenance request created successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create maintenance request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaintenanceFormData) => {
    createMaintenanceMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Maintenance Request</DialogTitle>
          <DialogDescription>
            Create a new maintenance request for a property unit. Specify details about the issue and its priority level.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property & Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="maintenance-unit-select">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units?.length > 0 ? (
                        units.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.property?.name} - {unit.unitNumber}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-units" disabled>
                          No units found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedUnit && (
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="maintenance-tenant-select">
                          <SelectValue placeholder="Select tenant (if applicable)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific tenant</SelectItem>
                        {tenants
                          ?.filter((t: any) => t.unit?.id === selectedUnitId)
                          .map((tenant: any) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.firstName} {tenant.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="maintenance-priority-select">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="maintenance-category-select">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="appliance">Appliance</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Brief description" 
                      {...field} 
                      data-testid="maintenance-title-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of the issue" 
                      rows={3} 
                      {...field} 
                      data-testid="maintenance-description-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Cost (KSh, Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="25000" 
                      {...field} 
                      data-testid="maintenance-cost-input"
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
                onClick={() => onClose()}
                data-testid="cancel-maintenance-button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMaintenanceMutation.isPending}
                data-testid="submit-maintenance-button"
              >
                {createMaintenanceMutation.isPending ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
