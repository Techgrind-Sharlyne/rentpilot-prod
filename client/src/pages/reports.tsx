import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  TrendingUp, 
  Home, 
  Wrench, 
  DollarSign,
  FileText,
  Calendar,
  BarChart3
} from "lucide-react";
import type { PaymentsResponse, DashboardStatsResponse, PropertiesResponse } from "@/types/api";

export default function Reports() {
  const [reportType, setReportType] = useState("financial");
  const [dateRange, setDateRange] = useState("30");

  const { data: stats } = useQuery<DashboardStatsResponse>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: properties } = useQuery<PropertiesResponse>({
    queryKey: ["/api/properties"],
  });

  const { data: payments } = useQuery<PaymentsResponse>({
    queryKey: ["/api/payments"],
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const calculateROI = () => {
    if (!properties || properties.length === 0) return 0;
    const totalValue = properties.reduce((sum: number, prop: any) => 
      sum + Number(prop.purchasePrice || 0), 0);
    const annualRevenue = (stats?.totalRevenue || 0) * 12;
    return totalValue > 0 ? ((annualRevenue / totalValue) * 100) : 0;
  };

  const reportTypes = [
    {
      id: "financial",
      name: "Financial Report",
      description: "Revenue, expenses & profit",
      icon: TrendingUp,
      color: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
    },
    {
      id: "occupancy",
      name: "Occupancy Report",
      description: "Vacancy rates & trends",
      icon: Home,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    },
    {
      id: "maintenance",
      name: "Maintenance Report",
      description: "Request analytics",
      icon: Wrench,
      color: "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300",
    },
  ];

  return (
    <>
      <Header
        title="Reports & Analytics"
        subtitle="Generate detailed reports and analyze performance"
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Business Intelligence</h2>
            <p className="text-muted-foreground">
              Comprehensive reporting and analytics dashboard
            </p>
          </div>
          <Button data-testid="export-report-button">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  reportType === type.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setReportType(type.id)}
                data-testid={`report-type-${type.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${type.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{type.name}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <Button 
                    variant={reportType === type.id ? "default" : "outline"}
                    className="w-full"
                    size="sm"
                  >
                    {reportType === type.id ? "Selected" : "Generate"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Report Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="font-semibold">Report Settings</h3>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40" data-testid="date-range-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">This year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" data-testid="preview-report">
                  <FileText className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm" data-testid="download-report">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card data-testid="performance-overview-card">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium mb-4">Key Metrics</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Portfolio Value</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        properties?.reduce((sum: number, prop: any) => 
                          sum + Number(prop.purchasePrice || 100000), 0) || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Rent</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        stats?.totalUnits > 0 
                          ? (stats.totalRevenue || 0) / stats.totalUnits 
                          : 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rent per Sq Ft</span>
                    <span className="font-semibold">KSh 142</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Annual ROI</span>
                    <span className="font-semibold text-green-600">
                      {calculateROI().toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-4">Performance Trends</h4>
                <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-medium">Chart Coming Soon</p>
                    <p className="text-sm">Performance trends will be displayed here</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="monthly-revenue-summary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <div className="flex items-center mt-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  +12% MoM
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="occupancy-rate-summary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Occupancy Rate</h3>
                <Home className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">
                {stats?.totalUnits > 0 
                  ? `${((stats.occupiedUnits / stats.totalUnits) * 100).toFixed(1)}%`
                  : "0%"
                }
              </div>
              <div className="flex items-center mt-2">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  Industry avg: 85%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="collection-rate-summary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Collection Rate</h3>
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold">94.2%</div>
              <div className="flex items-center mt-2">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                  Excellent
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="maintenance-cost-summary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Maintenance Cost</h3>
                <Wrench className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency((stats?.totalRevenue || 0) * 0.08)}
              </div>
              <div className="flex items-center mt-2">
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                  8% of revenue
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Summary */}
        <Card data-testid="activity-summary-card">
          <CardHeader>
            <CardTitle>Report Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Financial Highlights</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Total Properties:</span>
                    <span className="font-medium">{properties?.length || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Total Units:</span>
                    <span className="font-medium">{stats?.totalUnits || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Occupied Units:</span>
                    <span className="font-medium">{stats?.occupiedUnits || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Annual Revenue:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency((stats?.totalRevenue || 0) * 12)}
                    </span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Operational Metrics</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Open Maintenance:</span>
                    <span className="font-medium">{stats?.maintenanceCount || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Urgent Requests:</span>
                    <span className="font-medium text-red-600">
                      {stats?.urgentMaintenanceCount || 0}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Overdue Payments:</span>
                    <span className="font-medium text-amber-600">
                      {stats?.overdueCount || 0}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Avg Response Time:</span>
                    <span className="font-medium">2.4 hrs</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
