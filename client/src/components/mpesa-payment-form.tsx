import { useState } from "react";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smartphone, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const mpesaPaymentSchema = z.object({
  tenantId: z.string().min(1, "Please select a tenant"),
  unitId: z.string().min(1, "Please select a unit"),
  amount: z.string().min(1, "Amount is required"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^(0|254|(\+254))?[7][0-9]{8}$/, "Enter a valid Kenyan phone number (e.g., 0712345678)"),
  description: z.string().optional(),
});

type MPesaPaymentFormData = z.infer<typeof mpesaPaymentSchema>;

interface PaymentStatus {
  id: string;
  status: 'pending' | 'paid' | 'failed';
  message: string;
  amount: number;
  phoneNumber: string;
  timestamp: string;
}

export function MPesaPaymentForm() {
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { data: tenants } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  const form = useForm<MPesaPaymentFormData>({
    resolver: zodResolver(mpesaPaymentSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: "",
      phoneNumber: "",
      description: "",
    },
  });

  // Auto-populate amount when unit is selected
  const selectedUnitId = form.watch("unitId");
  const selectedUnit = units?.find((unit: any) => unit.id === selectedUnitId);

  React.useEffect(() => {
    if (selectedUnit?.monthlyRent) {
      form.setValue("amount", selectedUnit.monthlyRent.toString());
    }
  }, [selectedUnit, form]);

  const initiatePaymentMutation = useMutation({
    mutationFn: async (data: MPesaPaymentFormData) => {
      const response = await apiRequest("POST", "/api/mpesa/payment", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPaymentStatus({
          id: data.paymentId,
          status: 'pending',
          message: data.message,
          amount: parseFloat(form.getValues("amount")),
          phoneNumber: form.getValues("phoneNumber"),
          timestamp: new Date().toISOString(),
        });
        
        // Start polling for payment status
        startStatusPolling(data.paymentId);
        
        toast({
          title: "Payment Request Sent",
          description: "Check your phone for the M-Pesa prompt",
        });
      } else {
        toast({
          title: "Payment Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  const startStatusPolling = (paymentId: string) => {
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const response = await apiRequest("GET", `/api/mpesa/status/${paymentId}`);
        const statusData = await response.json();
        
        if (statusData.status === 'paid') {
          setPaymentStatus(prev => prev ? { ...prev, status: 'paid', message: 'Payment successful!' } : null);
          setIsPolling(false);
          clearInterval(pollInterval);
          
          toast({
            title: "Payment Successful",
            description: "Your rent payment has been received",
          });
          
          // Reset form
          form.reset();
        } else if (statusData.status === 'failed') {
          setPaymentStatus(prev => prev ? { ...prev, status: 'failed', message: 'Payment failed or cancelled' } : null);
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPolling(false);
    }, 120000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount).replace('KES', 'KSh');
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display (e.g., 0712345678 -> 0712 345 678)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('254')) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    } else if (cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  };

  const onSubmit = (data: MPesaPaymentFormData) => {
    initiatePaymentMutation.mutate(data);
  };

  const StatusBadge = ({ status }: { status: 'pending' | 'paid' | 'failed' }) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      paid: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      failed: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
    };
    
    const { variant, icon: Icon, color } = variants[status];
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            M-Pesa Payment
          </CardTitle>
          <CardDescription>
            Pay your rent securely using M-Pesa. You'll receive a prompt on your phone to complete the payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant</Label>
                <Select onValueChange={(value) => form.setValue("tenantId", value)}>
                  <SelectTrigger data-testid="select-tenant">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant: any) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.firstName} {tenant.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.tenantId && (
                  <p className="text-sm text-red-500">{form.formState.errors.tenantId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitId">Unit</Label>
                <Select onValueChange={(value) => form.setValue("unitId", value)}>
                  <SelectTrigger data-testid="select-unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units?.map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.unitNumber} - {formatCurrency(parseFloat(unit.monthlyRent))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.unitId && (
                  <p className="text-sm text-red-500">{form.formState.errors.unitId.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KSh)</Label>
                <Input
                  {...form.register("amount")}
                  type="number"
                  placeholder="50000"
                  data-testid="input-amount"
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                <Input
                  {...form.register("phoneNumber")}
                  type="tel"
                  placeholder="0712345678"
                  data-testid="input-phone"
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-sm text-red-500">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                {...form.register("description")}
                placeholder="Rent payment for January 2025"
                data-testid="input-description"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={initiatePaymentMutation.isPending || isPolling}
              data-testid="button-pay"
            >
              {initiatePaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initiating Payment...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Pay with M-Pesa
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {paymentStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Payment Status
              <StatusBadge status={paymentStatus.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">{formatCurrency(paymentStatus.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone Number</p>
                <p className="font-medium">{formatPhoneNumber(paymentStatus.phoneNumber)}</p>
              </div>
            </div>
            
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{paymentStatus.message}</p>
            </div>
            
            {isPolling && paymentStatus.status === 'pending' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for payment confirmation...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}