import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordPaymentModal } from "@/components/modals/record-payment-modal";
import { GenerateInvoiceModal } from "@/components/modals/generate-invoice-modal";
import { Calendar, DollarSign, TrendingUp, Shield } from "lucide-react";
import type { PaymentsResponse, DashboardStatsResponse } from "@/types/api";

export default function Financial() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState("30");

  const { data: payments, isLoading: paymentsLoading } = useQuery<PaymentsResponse>({
    queryKey: ["/api/payments"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStatsResponse>({
    queryKey: ["/api/dashboard/stats"],
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const recentTransactions = payments?.slice(0, 10) || [];

  return (
    <>
      <Header
        title="Financial Management"
        subtitle="Track payments, invoices, and financial reports"
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Financial Overview</h2>
            <p className="text-muted-foreground">
              Manage payments and financial reporting
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowPaymentModal(true)}
              className="bg-green-600 text-white hover:bg-green-700"
              data-testid="record-payment-button"
            >
              Record Payment
            </Button>
            <Button 
              onClick={() => setShowInvoiceModal(true)}
              data-testid="generate-invoice-button"
            >
              Generate Invoice
            </Button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card data-testid="monthly-summary-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">This Month</h3>
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Expected:</span>
                    <span className="font-medium">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Collected:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency((stats?.totalRevenue || 0) - (stats?.pendingPayments || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Outstanding:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(stats?.pendingPayments || 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card data-testid="ytd-summary-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Year to Date</h3>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Revenue:</span>
                  <span className="font-medium">
                    {formatCurrency((stats?.totalRevenue || 0) * 12)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expenses:</span>
                  <span className="font-medium">
                    {formatCurrency((stats?.totalRevenue || 0) * 0.25)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net Income:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency((stats?.totalRevenue || 0) * 0.75 * 12)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="deposits-summary-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Security Deposits</h3>
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Held:</span>
                  <span className="font-medium">
                    {formatCurrency((stats?.totalUnits || 0) * 1000)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending Return:</span>
                  <span className="font-medium text-amber-600">KSh 0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card data-testid="transactions-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <div className="flex space-x-2">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-40" data-testid="time-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">This year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" data-testid="export-button">
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {paymentsLoading ? (
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm">Date</th>
                      <th className="text-left p-4 font-medium text-sm">Tenant</th>
                      <th className="text-left p-4 font-medium text-sm">Unit</th>
                      <th className="text-left p-4 font-medium text-sm">Type</th>
                      <th className="text-left p-4 font-medium text-sm">Amount</th>
                      <th className="text-left p-4 font-medium text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((payment: any) => (
                        <tr 
                          key={payment.id} 
                          className="hover:bg-muted/50 transition-colors"
                          data-testid={`transaction-${payment.id}`}
                        >
                          <td className="p-4">{formatDate(payment.paymentDate)}</td>
                          <td className="p-4">
                            {payment.tenant?.firstName} {payment.tenant?.lastName}
                          </td>
                          <td className="p-4">{payment.unit?.unitNumber}</td>
                          <td className="p-4">
                            {payment.description || "Rent Payment"}
                          </td>
                          <td className="p-4 font-medium text-green-600">
                            {formatCurrency(Number(payment.amount))}
                          </td>
                          <td className="p-4">
                            <Badge 
                              className={getStatusColor(payment.status)}
                              data-testid={`transaction-${payment.id}-status`}
                            >
                              {payment.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <div className="text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                            <p>Start by recording your first payment</p>
                            <Button 
                              onClick={() => setShowPaymentModal(true)} 
                              className="mt-4"
                              data-testid="record-first-payment"
                            >
                              Record Payment
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecordPaymentModal 
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />
      
      <GenerateInvoiceModal 
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
      />
    </>
  );
}
