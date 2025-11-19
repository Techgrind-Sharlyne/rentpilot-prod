import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Phone, User, Receipt } from "lucide-react";
import { LiveEvents } from "@/components/LiveEvents";

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface Invoice {
  id: string;
  tenantId: string;
  periodMonth: number;
  periodYear: number;
  amountDue: string;
  amountPaid: string;
  status: string;
  dueDate: string;
}

export default function SimulatePayment() {
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("20000");
  const [msisdn, setMsisdn] = useState("254712345678");
  const [account, setAccount] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
  });

  // Fetch invoices for selected tenant
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/tenants", selectedTenantId, "invoices"],
    queryFn: () => selectedTenantId ? 
      apiRequest("GET", `/api/tenants/${selectedTenantId}/invoices`) : 
      Promise.resolve([]),
    enabled: !!selectedTenantId,
  });

  // Payment simulation mutation
  const simulatePaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest("POST", "/mock/mpesa/c2b", paymentData);
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Simulation Successful",
        description: `Transaction ${data.tx_id} processed successfully`,
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      if (selectedTenantId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/tenants", selectedTenantId, "invoices"] 
        });
      }
      
      // Reset form
      setSelectedInvoiceId("");
      setAmount("20000");
    },
    onError: (error: any) => {
      toast({
        title: "Payment Simulation Failed",
        description: error.response?.data?.error || error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Update tenant selection
  useEffect(() => {
    if (selectedTenantId) {
      const tenant = tenants.find((t: any) => t.id === selectedTenantId);
      setSelectedTenant(tenant || null);
      setMsisdn(tenant?.phone || "254712345678");
      setSelectedInvoiceId(""); // Reset invoice selection
    }
  }, [selectedTenantId, tenants]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTenantId) {
      toast({
        title: "Validation Error",
        description: "Please select a tenant",
        variant: "destructive",
      });
      return;
    }

    const txId = "TX" + Math.random().toString(36).slice(2, 9).toUpperCase();
    
    const paymentData = {
      tx_id: txId,
      amount: Number(amount),
      msisdn,
      account: account || "SIM-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      invoice_id: selectedInvoiceId || null,
      paid_at: new Date().toISOString(),
      meta: {
        narration: `Rent payment simulation for ${selectedTenant?.firstName} ${selectedTenant?.lastName}`
      }
    };

    simulatePaymentMutation.mutate(paymentData);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Simulation Form */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Simulate Rent Payment
          </CardTitle>
          <CardDescription>
            Test M-Pesa payment processing with real-time updates
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label htmlFor="tenant-select" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Select Tenant
              </Label>
              <Select 
                value={selectedTenantId} 
                onValueChange={setSelectedTenantId}
                disabled={tenantsLoading}
              >
                <SelectTrigger data-testid="select-tenant">
                  <SelectValue placeholder={tenantsLoading ? "Loading tenants..." : "Choose a tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant: any) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName} — {tenant.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Selection */}
            {selectedTenantId && (
              <div className="space-y-2">
                <Label htmlFor="invoice-select" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Select Invoice (Optional)
                </Label>
                <Select 
                  value={selectedInvoiceId} 
                  onValueChange={setSelectedInvoiceId}
                  disabled={invoicesLoading}
                >
                  <SelectTrigger data-testid="select-invoice">
                    <SelectValue placeholder={
                      invoicesLoading ? "Loading invoices..." : 
                      invoices.length === 0 ? "No unpaid invoices" :
                      "Choose an invoice (or leave blank for advance payment)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(invoices) && invoices.map((invoice: Invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.periodMonth}/{invoice.periodYear} • 
                        Due: KES {Number(invoice.amountDue).toLocaleString()} • 
                        Paid: KES {Number(invoice.amountPaid).toLocaleString()} • 
                        Status: {invoice.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Account/Unit Code */}
            <div className="space-y-2">
              <Label htmlFor="account">Account/Unit Code</Label>
              <Input
                id="account"
                type="text"
                placeholder="e.g., A-101, B-204"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                data-testid="input-account"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="msisdn" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                M-Pesa Phone Number
              </Label>
              <Input
                id="msisdn"
                type="tel"
                placeholder="254712345678"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                data-testid="input-phone"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="1"
                placeholder="20000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={simulatePaymentMutation.isPending || !selectedTenantId}
              data-testid="button-simulate-payment"
            >
              {simulatePaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Send Mock Payment
                </>
              )}
            </Button>
          </form>

          {/* Selected Tenant Info */}
          {selectedTenant && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Selected Tenant</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Name:</strong> {selectedTenant.firstName} {selectedTenant.lastName}</p>
                <p><strong>Phone:</strong> {selectedTenant.phone}</p>
                <p><strong>Email:</strong> {selectedTenant.email}</p>
              </div>
            </div>
          )}
        </CardContent>
        </Card>

        {/* Live Events Panel */}
        <LiveEvents />
      </div>
    </div>
  );
}