import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Phone,
  Users,
  TrendingUp
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RentStatus {
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  monthlyRent: number;
  lastPaymentDate?: string;
  amountPaid: number;
  arrearsAmount: number;
  status: 'cleared' | 'partial' | 'overdue';
}

interface OverduePayment {
  id: string;
  amount: number;
  dueDate: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  unit: {
    unitNumber: string;
  };
  property: {
    name: string;
  };
}

export default function RentStatusPage() {
  const [selectedTenant, setSelectedTenant] = useState<RentStatus | null>(null);
  const [stkAmount, setStkAmount] = useState("");
  const [stkDescription, setStkDescription] = useState("Rent payment");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rentStatus, isLoading: rentStatusLoading } = useQuery<RentStatus[]>({
    queryKey: ["/api/payments/rent-status"],
  });

  const { data: overduePayments, isLoading: overdueLoading } = useQuery<OverduePayment[]>({
    queryKey: ["/api/payments/overdue"],
  });

  const stkPushMutation = useMutation({
    mutationFn: async ({ tenantId, amount, description }: {
      tenantId: string;
      amount: number;
      description: string;
    }) => {
      return apiRequest("POST", "/api/mpesa/manual-payment", {
        tenantId,
        amount,
        description
      });
    },
    onSuccess: () => {
      toast({
        title: "STK Push Sent",
        description: "Payment request has been sent to the tenant's phone.",
      });
      setIsDialogOpen(false);
      setStkAmount("");
      setStkDescription("Rent payment");
      // Refresh the rent status data
      queryClient.invalidateQueries({ queryKey: ["/api/payments/rent-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/overdue"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send STK push request",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "cleared": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "partial": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "cleared": return <CheckCircle className="h-4 w-4" />;
      case "partial": return <Clock className="h-4 w-4" />;
      case "overdue": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleSendSTKPush = () => {
    if (!selectedTenant || !stkAmount) {
      toast({
        title: "Error",
        description: "Please select a tenant and enter an amount",
        variant: "destructive",
      });
      return;
    }

    stkPushMutation.mutate({
      tenantId: selectedTenant.tenantId,
      amount: Number(stkAmount),
      description: stkDescription,
    });
  };

  // Calculate summary statistics
  const summary = rentStatus ? {
    total: rentStatus.length,
    cleared: rentStatus.filter(r => r.status === 'cleared').length,
    partial: rentStatus.filter(r => r.status === 'partial').length,
    overdue: rentStatus.filter(r => r.status === 'overdue').length,
    totalArrears: rentStatus.reduce((sum, r) => sum + r.arrearsAmount, 0),
    totalCollected: rentStatus.reduce((sum, r) => sum + r.amountPaid, 0),
  } : null;

  return (
    <>
      <Header 
        title="Rent Status Dashboard" 
        subtitle="Monitor rent payments, arrears, and send payment requests"
      />
      
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="total-tenants-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Tenants</h3>
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              {rentStatusLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{summary?.total || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="cleared-rent-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Cleared Rent</h3>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              {rentStatusLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-green-600">{summary?.cleared || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="overdue-rent-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Overdue Rent</h3>
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              {rentStatusLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-red-600">{summary?.overdue || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="total-arrears-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Arrears</h3>
                <DollarSign className="h-5 w-5 text-red-500" />
              </div>
              {rentStatusLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary?.totalArrears || 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rent Status Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rent Status Overview</CardTitle>
              <CardDescription>
                Current rent payment status for all tenants
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="send-payment-request-button">
                  <Phone className="h-4 w-4 mr-2" />
                  Send Payment Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Payment Request</DialogTitle>
                  <DialogDescription>
                    Send an STK push request to a tenant's phone for payment
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tenant-select">Select Tenant</Label>
                    <select
                      id="tenant-select"
                      className="w-full p-2 border rounded-md"
                      value={selectedTenant?.tenantId || ""}
                      onChange={(e) => {
                        const tenant = rentStatus?.find(r => r.tenantId === e.target.value);
                        setSelectedTenant(tenant || null);
                        if (tenant && tenant.arrearsAmount > 0) {
                          setStkAmount(tenant.arrearsAmount.toString());
                        }
                      }}
                      data-testid="tenant-select"
                    >
                      <option value="">Select a tenant...</option>
                      {rentStatus?.map((tenant) => (
                        <option key={tenant.tenantId} value={tenant.tenantId}>
                          {tenant.tenantName} - {tenant.unitNumber} ({tenant.propertyName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (KSh)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={stkAmount}
                      onChange={(e) => setStkAmount(e.target.value)}
                      data-testid="payment-amount-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Payment description"
                      value={stkDescription}
                      onChange={(e) => setStkDescription(e.target.value)}
                      data-testid="payment-description-input"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleSendSTKPush} 
                    disabled={stkPushMutation.isPending || !selectedTenant || !stkAmount}
                    data-testid="send-stk-button"
                  >
                    {stkPushMutation.isPending ? "Sending..." : "Send STK Push"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {rentStatusLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Tenant</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-left p-2">Property</th>
                      <th className="text-left p-2">Monthly Rent</th>
                      <th className="text-left p-2">Last Payment</th>
                      <th className="text-left p-2">Amount Paid</th>
                      <th className="text-left p-2">Arrears</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentStatus?.map((tenant) => (
                      <tr key={tenant.tenantId} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium" data-testid={`tenant-name-${tenant.tenantId}`}>
                          {tenant.tenantName}
                        </td>
                        <td className="p-2">{tenant.unitNumber}</td>
                        <td className="p-2">{tenant.propertyName}</td>
                        <td className="p-2">{formatCurrency(tenant.monthlyRent)}</td>
                        <td className="p-2">
                          {tenant.lastPaymentDate ? formatDate(tenant.lastPaymentDate) : "N/A"}
                        </td>
                        <td className="p-2">{formatCurrency(tenant.amountPaid)}</td>
                        <td className="p-2">
                          {tenant.arrearsAmount > 0 ? (
                            <span className="text-red-600 font-medium">
                              {formatCurrency(tenant.arrearsAmount)}
                            </span>
                          ) : (
                            <span className="text-green-600">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          <Badge className={getStatusColor(tenant.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(tenant.status)}
                              {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                            </div>
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              if (tenant.arrearsAmount > 0) {
                                setStkAmount(tenant.arrearsAmount.toString());
                              } else {
                                setStkAmount(tenant.monthlyRent.toString());
                              }
                              setIsDialogOpen(true);
                            }}
                            data-testid={`send-request-${tenant.tenantId}`}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Request
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {rentStatus?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No tenants found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Payments Section */}
        {overduePayments && overduePayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Overdue Payments
              </CardTitle>
              <CardDescription>
                Payments that are past their due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {overduePayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`overdue-payment-${payment.id}`}
                    >
                      <div>
                        <div className="font-medium">
                          {payment.tenant?.firstName || ''} {payment.tenant?.lastName || ''}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.unit?.unitNumber || 'N/A'} - {payment.property?.name || 'Unknown Property'}
                        </div>
                        <div className="text-sm text-red-600">
                          Due: {formatDate(payment.dueDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {formatCurrency(Number(payment.amount))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            const tenant = rentStatus?.find(r => r.tenantId === payment.tenant?.id);
                            if (tenant && payment.tenant?.id) {
                              setSelectedTenant(tenant);
                              setStkAmount(payment.amount.toString());
                              setStkDescription(`Overdue payment - Due: ${formatDate(payment.dueDate)}`);
                              setIsDialogOpen(true);
                            }
                          }}
                          data-testid={`request-overdue-${payment.id}`}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Request Payment
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}