import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, CreditCard, Smartphone, DollarSign, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MPesaPaymentForm } from "@/components/mpesa-payment-form";
import type { PaymentWithDetails } from "@/stubs/schema";

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: payments, isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount).replace('KES', 'KSh');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
      failed: "destructive",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mpesa':
        return <Smartphone className="h-4 w-4 text-green-600" />;
      case 'credit_card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'bank_transfer':
        return <DollarSign className="h-4 w-4 text-purple-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch = payment.tenant && (
      `${payment.tenant.firstName} ${payment.tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.unit?.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.property?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesPaymentMethod = paymentMethodFilter === "all" || payment.paymentMethod === paymentMethodFilter;
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesPaymentMethod && matchesStatus;
  }) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage rent payments and transactions</p>
        </div>
        <Button 
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          data-testid="button-new-payment"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Payment
        </Button>
      </div>

      {showPaymentForm && (
        <div className="mb-8">
          <MPesaPaymentForm />
        </div>
      )}

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    payments?.filter(p => p.status === 'paid')
                      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">
                  {payments?.filter(p => p.status === 'paid').length || 0}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">
                  {payments?.filter(p => p.status === 'pending').length || 0}
                </p>
              </div>
              <Smartphone className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">M-Pesa Payments</p>
                <p className="text-2xl font-bold">
                  {payments?.filter(p => p.paymentMethod === 'mpesa').length || 0}
                </p>
              </div>
              <Smartphone className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant, unit, or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="filter-payment-method">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            All rent payments and transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-medium">Tenant</th>
                    <th className="text-left p-4 font-medium">Unit</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Method</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/50" data-testid={`payment-row-${payment.id}`}>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {payment.tenant ? `${payment.tenant.firstName} ${payment.tenant.lastName}` : 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.tenant?.email}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{payment.unit?.unitNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.property?.name}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{formatCurrency(parseFloat(payment.amount.toString()))}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="p-4">
                        <p>{formatDate(payment.paymentDate.toString())}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-mono">
                          {payment.mpesaReceiptNumber || payment.transactionId || 'N/A'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}