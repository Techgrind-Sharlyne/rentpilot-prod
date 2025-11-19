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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Home, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Settings, 
  DollarSign,
  Zap,
  Droplets,
  Building,
  Loader2,
  MapPin
} from "lucide-react";
import type { PropertyWithDetails } from "@/stubs/schema";

// Enhanced unit form schema with all enterprise features
const unitFormSchema = z.object({
  propertyId: z.string().min(1, "Property selection is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  monthlyRent: z.coerce.number().min(1, "Monthly rent must be greater than 0"),
  status: z.enum(["vacant", "occupied", "maintenance", "reserved", "under_renovation"]).default("vacant"),
  
  // Unit specifications
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  squareFeet: z.coerce.number().optional(),
  floorNumber: z.coerce.number().optional(),
  description: z.string().optional(),
  
  // Utility settings
  hasWater: z.boolean().default(true),
  hasElectricity: z.boolean().default(true),
  waterUnits: z.coerce.number().optional(),
  electricityUnits: z.coerce.number().optional(),
  
  // Advanced settings
  securityDeposit: z.coerce.number().optional(),
  latePaymentFee: z.coerce.number().optional(),
  petDeposit: z.coerce.number().optional(),
  
  // Features
  hasBalcony: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  isFurnished: z.boolean().default(false),
  hasAC: z.boolean().default(false),
});

type UnitFormData = z.infer<typeof unitFormSchema>;

const recurringFeeTypes = [
  { value: "garbage", label: "Garbage Collection" },
  { value: "parking", label: "Parking Fee" },
  { value: "security", label: "Security Service" },
  { value: "internet", label: "Internet Connection" },
  { value: "service_fee", label: "Service Fee" },
  { value: "water", label: "Water Service" },
  { value: "other", label: "Other Fee" },
];

interface AddUnitModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedPropertyId?: string;
  editUnit?: any; // Unit to edit, if in edit mode
}

export function AddUnitModal({ open, onClose, preSelectedPropertyId, editUnit }: AddUnitModalProps) {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recurringFees, setRecurringFees] = useState<Array<{ type: string; amount: number; description?: string }>>([]);
  const isEditing = !!editUnit;

  const { data: properties } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      propertyId: editUnit?.propertyId || preSelectedPropertyId || "",
      unitNumber: editUnit?.unitNumber || "",
      monthlyRent: editUnit?.monthlyRent || 0,
      status: editUnit?.status || "vacant",
      bedrooms: editUnit?.bedrooms || 1,
      bathrooms: editUnit?.bathrooms || 1,
      squareFeet: editUnit?.squareFeet || undefined,
      floorNumber: editUnit?.floorNumber || undefined,
      description: editUnit?.description || "",
      hasWater: editUnit?.hasWater ?? true,
      hasElectricity: editUnit?.hasElectricity ?? true,
      waterUnits: editUnit?.waterUnits || undefined,
      electricityUnits: editUnit?.electricityUnits || undefined,
      securityDeposit: editUnit?.securityDeposit || undefined,
      latePaymentFee: editUnit?.latePaymentFee || undefined,
      petDeposit: editUnit?.petDeposit || undefined,
      hasBalcony: editUnit?.hasBalcony || false,
      hasParking: editUnit?.hasParking || false,
      isFurnished: editUnit?.isFurnished || false,
      hasAC: editUnit?.hasAC || false,
    },
  });

  // Set pre-selected property if provided
  useEffect(() => {
    if (preSelectedPropertyId && open) {
      form.setValue("propertyId", preSelectedPropertyId);
    }
  }, [preSelectedPropertyId, open, form]);

  // Auto-calculate security deposit as 1x monthly rent
  const monthlyRent = form.watch("monthlyRent");
  useEffect(() => {
    if (monthlyRent > 0 && !form.getValues("securityDeposit")) {
      form.setValue("securityDeposit", monthlyRent);
    }
  }, [monthlyRent, form]);

  const createUnitMutation = useMutation({
    mutationFn: async (data: UnitFormData) => {
      const cleanedData = {
        ...data,
        monthlyRent: Number(data.monthlyRent),
        bedrooms: data.bedrooms ? Number(data.bedrooms) : null,
        bathrooms: data.bathrooms ? Number(data.bathrooms) : null,
        squareFeet: data.squareFeet ? Number(data.squareFeet) : null,
        floorNumber: data.floorNumber ? Number(data.floorNumber) : null,
        waterUnits: data.waterUnits ? Number(data.waterUnits) : null,
        electricityUnits: data.electricityUnits ? Number(data.electricityUnits) : null,
        securityDeposit: data.securityDeposit ? Number(data.securityDeposit) : null,
        latePaymentFee: data.latePaymentFee ? Number(data.latePaymentFee) : null,
        petDeposit: data.petDeposit ? Number(data.petDeposit) : null,
        description: data.description?.trim() || null,
      };

      if (isEditing && editUnit) {
        return await apiRequest("PUT", `/api/units/${editUnit.id}`, cleanedData);
      } else {
        return await apiRequest("POST", "/api/units", cleanedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: isEditing ? "Unit updated successfully!" : "Unit added successfully! You can now assign tenants to this unit.",
      });
      form.reset();
      setRecurringFees([]);
      setShowAdvanced(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create unit",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UnitFormData) => {
    createUnitMutation.mutate(data);
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

  const selectedProperty = properties?.find(p => p.id === form.watch("propertyId"));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Home className="w-6 h-6 text-green-600" />
            {isEditing ? "Edit Unit" : "Add New Unit"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update unit details and specifications." : "Add a new rental unit to a property with detailed specifications, utility settings, and rental terms."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Unit Information
                </CardTitle>
                <CardDescription>
                  Enter the essential details about this unit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Property *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Select a property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span>{property.name}</span>
                                <span className="text-muted-foreground text-sm">
                                  ({property.city})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProperty && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{selectedProperty.name}</span>
                      <span className="text-sm">• {selectedProperty.address}, {selectedProperty.city}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="unitNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 101, A1, etc." 
                            {...field} 
                            data-testid="input-unit-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent (KSh) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="25000" 
                            {...field} 
                            data-testid="input-monthly-rent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="under_renovation">Under Renovation</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="1" 
                            {...field} 
                            data-testid="input-bedrooms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="1" 
                            {...field} 
                            data-testid="input-bathrooms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="squareFeet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Footage</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="800" 
                            {...field} 
                            data-testid="input-square-footage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="floorNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="1" 
                            {...field} 
                            data-testid="input-floor-number"
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
                      <FormLabel>Unit Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the unit..."
                          rows={3}
                          {...field} 
                          data-testid="textarea-unit-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="hasBalcony"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">
                            Balcony
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-has-balcony"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasParking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">
                            Parking
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-has-parking"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFurnished"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">
                            Furnished
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-furnished"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasAC"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">
                            Air Conditioning
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-has-ac"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-dashed">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-green-600" />
                        <CardTitle className="text-lg">Advanced Settings</CardTitle>
                      </div>
                      {showAdvanced ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <CardDescription>
                      Configure utilities, deposits, and additional fees
                    </CardDescription>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4">
                {/* Utilities */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Utilities
                    </CardTitle>
                    <CardDescription>
                      Configure utility connections and current readings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="hasWater"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base flex items-center gap-2">
                                  <Droplets className="w-4 h-4 text-blue-600" />
                                  Water Connection
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Unit has water connection
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-has-water"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {form.watch("hasWater") && (
                          <FormField
                            control={form.control}
                            name="waterUnits"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Water Reading</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    placeholder="0" 
                                    {...field} 
                                    data-testid="input-water-units"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="hasElectricity"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-yellow-600" />
                                  Electricity Connection
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Unit has electricity connection
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-has-electricity"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {form.watch("hasElectricity") && (
                          <FormField
                            control={form.control}
                            name="electricityUnits"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Electricity Reading (kWh)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    placeholder="0" 
                                    {...field} 
                                    data-testid="input-electricity-units"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Settings */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Deposits & Fees
                    </CardTitle>
                    <CardDescription>
                      Configure security deposits and additional fees for this unit
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="securityDeposit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Security Deposit (KSh)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="25000" 
                                {...field} 
                                data-testid="input-security-deposit"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Usually 1x monthly rent
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="latePaymentFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Late Payment Fee (KSh)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="2500" 
                                {...field} 
                                data-testid="input-late-payment-fee"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="petDeposit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pet Deposit (KSh)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="5000" 
                                {...field} 
                                data-testid="input-pet-deposit"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Recurring Fees */}
                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Unit-Specific Recurring Fees
                    </CardTitle>
                    <CardDescription>
                      Add recurring fees that apply only to this unit
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
                data-testid="button-cancel-unit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createUnitMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                data-testid="button-create-unit"
              >
                {createUnitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Unit...
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4 mr-2" />
                    Create Unit
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