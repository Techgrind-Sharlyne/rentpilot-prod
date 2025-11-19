// client/src/components/modals/add-tenant-modal.tsx
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
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Settings,
  DollarSign,
  Building,
  Home,
  Mail,
  Phone,
  Calendar,
  FileText,
  Users,
  Loader2,
  MapPin,
} from "lucide-react";
import type { UnitWithDetails, PropertyWithDetails } from "@/stubs/schema";
import { SearchableUnitSelect } from "@/components/ui/searchable-unit-select";

// ⚙️ Relaxed schema: only basic details are strictly required
const tenantFormSchema = z.object({
  // Basic tenant information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  secondaryPhone: z.string().optional(),

  // ID and documents
  idNumber: z.string().optional(),
  passportNumber: z.string().optional(),

  // Emergency contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),

  // Lease information (now OPTIONAL – we can still use them if provided)
  unitId: z.string().optional(),
  monthlyRent: z.coerce.number().optional(),
  // Lease terms
  leaseStartDate: z.string().optional(),
  leaseEndDate: z.string().optional(),
  leaseStatus: z
    .enum(["active", "expired", "terminated", "pending"])
    .default("active")
    .optional(),

  // Deposits (optional)
  securityDeposit: z.coerce.number().optional(),
  waterDeposit: z.coerce.number().optional(),
  electricityDeposit: z.coerce.number().optional(),
  keyDeposit: z.coerce.number().optional(),

  // Move-in details
  moveInDate: z.string().optional(),
  previousWaterReading: z.coerce.number().optional(),
  previousElectricityReading: z.coerce.number().optional(),

  // Additional settings
  petAllowed: z.boolean().default(false),
  petType: z.string().optional(),
  petDeposit: z.coerce.number().optional(),
  specialTerms: z.string().optional(),

  // Occupation details
  occupation: z.string().optional(),
  employer: z.string().optional(),
  workAddress: z.string().optional(),
  workPhone: z.string().optional(),
  monthlyIncome: z.coerce.number().optional(),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

const gadgetTypes = [
  { value: "tv", label: "Television" },
  { value: "fridge", label: "Refrigerator" },
  { value: "washing_machine", label: "Washing Machine" },
  { value: "microwave", label: "Microwave" },
  { value: "ac", label: "Air Conditioner" },
  { value: "water_heater", label: "Water Heater" },
  { value: "other", label: "Other" },
];

interface AddTenantModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedUnitId?: string;
}

export function AddTenantModal({
  open,
  onClose,
  preSelectedUnitId,
}: AddTenantModalProps) {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gadgets, setGadgets] = useState<
    Array<{ type: string; brand?: string; serialNumber?: string; value?: number }>
  >([]);
  const [documents, setDocuments] = useState<
    Array<{ type: string; name: string; required: boolean; uploaded: boolean }>
  >([]);

  const { data: units } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  const { data: properties } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      unitId: preSelectedUnitId || "",
      monthlyRent: undefined,
      securityDeposit: undefined,
      leaseStartDate: undefined,
      leaseStatus: "active",
      petAllowed: false,
    },
  });

  // Set pre-selected unit if provided
  useEffect(() => {
    if (preSelectedUnitId && open) {
      form.setValue("unitId", preSelectedUnitId);
      const unit = units?.find((u) => u.id === preSelectedUnitId);
      if (unit) {
        form.setValue("monthlyRent", Number(unit.monthlyRent) || undefined);
        form.setValue("securityDeposit", Number(unit.monthlyRent) || undefined);
      }
    }
  }, [preSelectedUnitId, open, form, units]);

  // Auto-populate fields when unit is selected
  const selectedUnitId = form.watch("unitId");
  const selectedUnit = units?.find((u) => u.id === selectedUnitId);

  useEffect(() => {
    if (selectedUnit) {
      form.setValue(
        "monthlyRent",
        Number(selectedUnit.monthlyRent) || undefined
      );
      if (!form.getValues("securityDeposit")) {
        form.setValue(
          "securityDeposit",
          Number(selectedUnit.monthlyRent) || undefined
        );
      }
    }
  }, [selectedUnit, form]);

  // 🔥 The actual tenant creation
  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      // Map to what the backend actually understands
      const baseTenant = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        // IMPORTANT: backend expects `phone`, not `phoneNumber`
        phone: data.phoneNumber.trim(),
        secondaryPhone: data.secondaryPhone?.trim() || null,
        idNumber: data.idNumber?.trim() || null,
        passportNumber: data.passportNumber?.trim() || null,
        emergencyContactName: data.emergencyContactName?.trim() || null,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
        petAllowed: data.petAllowed ?? false,
        petType: data.petType?.trim() || null,
        specialTerms: data.specialTerms?.trim() || null,
        occupation: data.occupation?.trim() || null,
        employer: data.employer?.trim() || null,
        workAddress: data.workAddress?.trim() || null,
        workPhone: data.workPhone?.trim() || null,
        monthlyIncome: data.monthlyIncome
          ? Number(data.monthlyIncome)
          : null,
      };

      // If a unit is selected, we also pass lease data (optional)
      const leaseData =
        data.unitId && data.unitId.length > 0
          ? {
              unitId: data.unitId,
              monthlyRent: data.monthlyRent
                ? Number(data.monthlyRent)
                : null,
              securityDeposit: data.securityDeposit
                ? Number(data.securityDeposit)
                : null,
              waterDeposit: data.waterDeposit
                ? Number(data.waterDeposit)
                : null,
              electricityDeposit: data.electricityDeposit
                ? Number(data.electricityDeposit)
                : null,
              keyDeposit: data.keyDeposit ? Number(data.keyDeposit) : null,
              petDeposit: data.petDeposit ? Number(data.petDeposit) : null,
              startDate: data.leaseStartDate || null,
              endDate: data.leaseEndDate || null,
              status: data.leaseStatus || "active",
              moveInDate: data.moveInDate || null,
              previousWaterReading: data.previousWaterReading
                ? Number(data.previousWaterReading)
                : null,
              previousElectricityReading: data.previousElectricityReading
                ? Number(data.previousElectricityReading)
                : null,
            }
          : null;

      const payload: any = {
        ...baseTenant,
      };

      // Only send lease/gadgets/documents if we actually have them
      if (leaseData) payload.leaseData = leaseData;
      if (gadgets.length)
        payload.gadgets = gadgets.filter((g) => g.type);
      if (documents.length)
        payload.documents = documents.filter((d) => d.name && d.type);

      // Uses /api/tenants which is already working for GET
      return await apiRequest("POST", "/api/tenants", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      toast({
        title: "Success",
        description:
          "Tenant created successfully. You can now manage their lease and payments.",
      });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      console.error("Failed to create tenant:", error);
      const msg =
        error?.message?.includes("already exists")
          ? "A tenant with this email already exists. Please use a different email."
          : error?.message || "Failed to create tenant. Please try again.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TenantFormData) => {
    createTenantMutation.mutate(data);
  };

  const addGadget = () => {
    setGadgets([
      ...gadgets,
      { type: "tv", brand: "", serialNumber: "", value: 0 },
    ]);
  };

  const updateGadget = (index: number, field: string, value: any) => {
    const updated = [...gadgets];
    updated[index] = { ...updated[index], [field]: value };
    setGadgets(updated);
  };

  const removeGadget = (index: number) => {
    setGadgets(gadgets.filter((_, i) => i !== index));
  };

  const addDocument = () => {
    setDocuments([
      ...documents,
      { type: "id_copy", name: "", required: true, uploaded: false },
    ]);
  };

  const updateDocument = (index: number, field: string, value: any) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    setDocuments(updated);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    form.reset();
    setGadgets([]);
    setDocuments([]);
    setShowAdvanced(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Filter available units (vacant only)
  const availableUnits =
    units?.filter((unit) => unit.status === "vacant") || [];
  const selectedProperty = properties?.find(
    (p) => p.id === selectedUnit?.propertyId
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <User className="w-6 h-6 text-blue-600" />
            Add New Tenant
          </DialogTitle>
          <DialogDescription>
            Register a new tenant with complete profile information. Lease
            details are optional but recommended.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Enter the tenant&apos;s basic personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            {...field}
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            {...field}
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Address *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john.doe@example.com"
                            {...field}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Phone Number *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="0712345678"
                            {...field}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National ID Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12345678"
                            {...field}
                            data-testid="input-id-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="0798765432"
                            {...field}
                            data-testid="input-secondary-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Unit & Lease Information (optional but powerful) */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Unit & Lease Information
                </CardTitle>
                <CardDescription>
                  Select the unit and configure lease terms (optional – you can
                  also use Assign Unit later).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Unit (optional)
                      </FormLabel>
                      <FormControl>
                        <SearchableUnitSelect
                          units={availableUnits}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder={
                            availableUnits.length > 0
                              ? "Search and select a unit..."
                              : "No vacant units available"
                          }
                          disabled={availableUnits.length === 0}
                          data-testid="select-unit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedUnit && selectedProperty && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">
                        Selected Unit: {selectedUnit.unitNumber}
                      </span>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      <p>
                        {selectedProperty.name} • {selectedProperty.address},{" "}
                        {selectedProperty.city}
                      </p>
                      <p>
                        {selectedUnit.bedrooms} bedrooms,{" "}
                        {selectedUnit.bathrooms} bathrooms
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent (KSh)</FormLabel>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leaseStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Lease Start Date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-lease-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leaseEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-lease-end-date"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Leave empty for flexible lease terms
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings (unchanged UI, all optional) */}
            {/* ... you can keep your Advanced sections exactly as before ... */}
            {/* For brevity, I’ve omitted the inner content; 
                you can keep the same "Additional Deposits", "Emergency Contact",
                "Employment Details", "Special Terms" blocks you already had.
                They all still work with the relaxed schema above. */}

            {/* Submit Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel-tenant"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTenantMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-create-tenant"
              >
                {createTenantMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Tenant...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    Create Tenant
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
