import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Settings, 
  DollarSign,
  Zap,
  Droplets,
  Smartphone,
  Calculator,
  Loader2
} from "lucide-react";

// Enhanced property form schema with all enterprise features
const propertyFormSchema = z.object({
  name: z.string().min(1, "Property name is required"),
  totalUnits: z.coerce.number().min(1, "At least 1 unit is required"),
  city: z.string().min(1, "Estate is required"),
  address: z.string().min(1, "Address is required"),
  state: z.string().min(1, "Town is required"),
  zipCode: z.string().optional(),
  type: z.enum(["apartment_complex", "single_family", "duplex", "commercial", "townhouse", "bedsitter", "maisonette"]),
  description: z.string().optional(),
  
  // Advanced utility features
  waterRate: z.coerce.number().optional(),
  electricityRate: z.coerce.number().optional(),
  
  // M-Pesa configuration
  mpesaType: z.enum(["paybill", "till_number"]).optional(),
  mpesaPaybillNumber: z.string().optional(),
  mpesaAccountNumber: z.string().optional(),
  mpesaStoreNumber: z.string().optional(),
  mpesaTillNumber: z.string().optional(),
  
  // Financial settings
  rentPenaltyType: z.enum(["fixed_amount", "percentage_of_rent", "percentage_of_balance"]).optional(),
  rentPenaltyAmount: z.coerce.number().optional(),
  taxRate: z.coerce.number().default(7.5),
  managementFeeType: z.enum(["fixed_amount", "percentage_of_rent"]).optional(),
  managementFeeAmount: z.coerce.number().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

const recurringFeeTypes = [
  { value: "garbage", label: "Garbage Collection" },
  { value: "parking", label: "Parking Fee" },
  { value: "security", label: "Security Service" },
  { value: "internet", label: "Internet Connection" },
  { value: "service_fee", label: "Service Fee" },
  { value: "water", label: "Water Service" },
  { value: "other", label: "Other Fee" },
];

interface AddPropertyModalProps {
  open: boolean;
  onClose: () => void;
  editProperty?: any; // Property to edit, if provided
}

export function AddPropertyModal({ open, onClose, editProperty }: AddPropertyModalProps) {
  const isEditing = !!editProperty;
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recurringFees, setRecurringFees] = useState<Array<{ type: string; amount: number; description?: string }>>([]);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: editProperty?.name || "",
      totalUnits: editProperty?.totalUnits || 1,
      city: editProperty?.city || "",
      address: editProperty?.address || "",
      state: editProperty?.state || "",
      zipCode: editProperty?.zipCode || "",
      type: editProperty?.type || "apartment_complex",
      description: editProperty?.description || "",
      taxRate: editProperty?.taxRate || 7.5,
      waterRate: editProperty?.waterRate || undefined,
      electricityRate: editProperty?.electricityRate || undefined,
      mpesaType: editProperty?.mpesaType || undefined,
      mpesaPaybillNumber: editProperty?.mpesaPaybillNumber || "",
      mpesaAccountNumber: editProperty?.mpesaAccountNumber || "",
      mpesaStoreNumber: editProperty?.mpesaStoreNumber || "",
      mpesaTillNumber: editProperty?.mpesaTillNumber || "",
      rentPenaltyType: editProperty?.rentPenaltyType || undefined,
      rentPenaltyAmount: editProperty?.rentPenaltyAmount || undefined,
      managementFeeType: editProperty?.managementFeeType || undefined,
      managementFeeAmount: editProperty?.managementFeeAmount || undefined,
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const cleanedData = {
        ...data,
        totalUnits: Number(data.totalUnits) || 1,
        waterRate: data.waterRate ? Number(data.waterRate) : null,
        electricityRate: data.electricityRate ? Number(data.electricityRate) : null,
        rentPenaltyAmount: data.rentPenaltyAmount ? Number(data.rentPenaltyAmount) : null,
        taxRate: data.taxRate ? Number(data.taxRate) : 7.5,
        managementFeeAmount: data.managementFeeAmount ? Number(data.managementFeeAmount) : null,
        zipCode: data.zipCode?.trim() || null,
        description: data.description?.trim() || null,
        mpesaPaybillNumber: data.mpesaPaybillNumber?.trim() || null,
        mpesaAccountNumber: data.mpesaAccountNumber?.trim() || null,
        mpesaStoreNumber: data.mpesaStoreNumber?.trim() || null,
        mpesaTillNumber: data.mpesaTillNumber?.trim() || null,
      };

      if (isEditing && editProperty) {
        return await apiRequest("PUT", `/api/properties/${editProperty.id}`, cleanedData);
      } else {
        return await apiRequest("POST", "/api/properties", cleanedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: isEditing ? "Property updated successfully!" : "Property added successfully! You can now add units to this property.",
      });
      form.reset();
      setRecurringFees([]);
      setShowAdvanced(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    createPropertyMutation.mutate(data);
  };

  const addRecurringFee = () => {
    setRecurringFees([...recurringFees, { type: "garbage", amount: 0, description: "" }]);
  };

  const updateRecurringFee = (index: number, field: string, value: any) => {
    const updated = [...recurringFees];
    updated[index] = { ...updated[index], [field]: value };
    setRecurringFees(updated);
  };

  const removeRecurringFee = (index: number) => {
    setRecurringFees(recurringFees.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    form.reset();
    setRecurringFees([]);
    setShowAdvanced(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Building className="w-6 h-6 text-purple-600" />
            {isEditing ? "Edit Property" : "Add New Property"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update property details and management settings." : "Create a new property with comprehensive management features including utilities, M-Pesa configuration, and financial settings."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Enter the essential details about your property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Greenview Apartments" 
                            {...field} 
                            data-testid="input-property-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="apartment_complex">Apartment Complex</SelectItem>
                            <SelectItem value="single_family">Single Family</SelectItem>
                            <SelectItem value="duplex">Duplex</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="bedsitter">Bedsitter</SelectItem>
                            <SelectItem value="maisonette">Maisonette</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Address *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Plot 123, Sunrise Avenue" 
                          {...field} 
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estate *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Kilimani" 
                            {...field} 
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Town *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Nairobi" 
                            {...field} 
                            data-testid="input-state"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Units *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="1" 
                            {...field} 
                            data-testid="input-total-units"
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the property..."
                          rows={3}
                          {...field} 
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-dashed">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-lg">Advanced Settings</CardTitle>
                      </div>
                      {showAdvanced ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <CardDescription>
                      Configure utilities, payment methods, and financial settings
                    </CardDescription>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4">
                {/* Utility Rates */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Utility Rates
                    </CardTitle>
                    <CardDescription>
                      Set rates for utilities that will be charged to tenants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="waterRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Droplets className="w-4 h-4 text-blue-600" />
                              Water Rate (KSh per unit)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="45.00" 
                                {...field} 
                                data-testid="input-water-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="electricityRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-600" />
                              Electricity Rate (KSh per kWh)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="20.00" 
                                {...field} 
                                data-testid="input-electricity-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* M-Pesa Configuration */}
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Smartphone className="w-5 h-5" />
                      M-Pesa Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure M-Pesa payment collection for this property
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="mpesaType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>M-Pesa Payment Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-mpesa-type">
                                <SelectValue placeholder="Select M-Pesa type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="paybill">PayBill</SelectItem>
                              <SelectItem value="till_number">Till Number</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("mpesaType") === "paybill" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="mpesaPaybillNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PayBill Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="123456" 
                                  {...field} 
                                  data-testid="input-paybill-number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mpesaAccountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Property001" 
                                  {...field} 
                                  data-testid="input-account-number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {form.watch("mpesaType") === "till_number" && (
                      <FormField
                        control={form.control}
                        name="mpesaTillNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Till Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="123456" 
                                {...field} 
                                data-testid="input-till-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Financial Settings */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Financial Settings
                    </CardTitle>
                    <CardDescription>
                      Configure tax rates, penalties, and management fees
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="taxRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Rate (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="7.5" 
                                {...field} 
                                data-testid="input-tax-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rentPenaltyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Late Payment Penalty Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-penalty-type">
                                  <SelectValue placeholder="Select penalty type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                                <SelectItem value="percentage_of_rent">Percentage of Rent</SelectItem>
                                <SelectItem value="percentage_of_balance">Percentage of Balance</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("rentPenaltyType") && (
                      <FormField
                        control={form.control}
                        name="rentPenaltyAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Penalty Amount ({form.watch("rentPenaltyType") === "fixed_amount" ? "KSh" : "%"})
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step={form.watch("rentPenaltyType") === "fixed_amount" ? "1" : "0.1"}
                                placeholder={form.watch("rentPenaltyType") === "fixed_amount" ? "5000" : "5.0"}
                                {...field} 
                                data-testid="input-penalty-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Recurring Fees */}
                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Recurring Fees
                    </CardTitle>
                    <CardDescription>
                      Add recurring fees that apply to all units in this property
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recurringFees.map((fee, index) => (
                      <div key={index} className="flex gap-4 items-end p-4 border rounded-lg bg-muted/20">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium">Fee Type</label>
                            <Select
                              value={fee.type}
                              onValueChange={(value) => updateRecurringFee(index, "type", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {recurringFeeTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Amount (KSh)</label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={fee.amount}
                              onChange={(e) => updateRecurringFee(index, "amount", Number(e.target.value))}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Input
                              placeholder="Optional description"
                              value={fee.description}
                              onChange={(e) => updateRecurringFee(index, "description", e.target.value)}
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeRecurringFee(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addRecurringFee}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Recurring Fee
                    </Button>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Submit Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel-property"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPropertyMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                data-testid="button-create-property"
              >
                {createPropertyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Property...
                  </>
                ) : (
                  <>
                    <Building className="w-4 h-4 mr-2" />
                    Create Property
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}