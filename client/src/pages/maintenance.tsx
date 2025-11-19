import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AddMaintenanceModal } from "@/components/modals/add-maintenance-modal";
import { TriangleAlert, Bolt, CheckCircle, Clock, MapPin, User, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MaintenanceRequestsResponse, DashboardStatsResponse } from "@/types/api";

export default function Maintenance() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery<MaintenanceRequestsResponse>({
    queryKey: ["/api/maintenance-requests"],
  });

  const { data: stats } = useQuery<DashboardStatsResponse>({
    queryKey: ["/api/dashboard/stats"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PUT", `/api/maintenance-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      toast({
        title: "Success",
        description: "Maintenance request status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update maintenance request status",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string) => {
    const now = new Date();
    const requestDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "1 day ago";
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "normal": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "low": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <TriangleAlert className="h-3 w-3 text-red-500" />;
      case "in_progress": return <Bolt className="h-3 w-3 text-blue-500" />;
      case "completed": return <CheckCircle className="h-3 w-3 text-green-500" />;
      default: return <Clock className="h-3 w-3 text-amber-500" />;
    }
  };

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const filteredRequests = requests?.filter((request: any) => {
    if (priorityFilter === "all") return true;
    return request.priority === priorityFilter;
  }) || [];

  return (
    <>
      <Header
        title="Maintenance Management"
        subtitle="Track and manage maintenance requests"
        onQuickAdd={() => setShowAddModal(true)}
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Maintenance Requests</h2>
            <p className="text-muted-foreground">
              {filteredRequests.length} of {requests?.length || 0} requests
            </p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            data-testid="add-maintenance-button"
          >
            Add Request
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card data-testid="open-requests-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Open Requests</h3>
                <TriangleAlert className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold">
                {requests?.filter((r: any) => r.status === "open").length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="in-progress-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">In Progress</h3>
                <Bolt className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">
                {requests?.filter((r: any) => r.status === "in_progress").length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="completed-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold">
                {requests?.filter((r: any) => r.status === "completed").length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="avg-response-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Avg Response</h3>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold">2.4h</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Filter Requests</h3>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48" data-testid="priority-filter">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Requests List */}
        <Card data-testid="requests-list-card">
          <CardHeader>
            <CardTitle>Maintenance Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center space-x-6">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request: any) => (
                    <div 
                      key={request.id} 
                      className="p-6 hover:bg-muted/50 transition-colors"
                      data-testid={`request-${request.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusIcon(request.status)}
                            <h4 className="font-semibold">{request.title}</h4>
                            <Badge 
                              className={getPriorityColor(request.priority)}
                              data-testid={`request-${request.id}-priority`}
                            >
                              {request.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {request.description}
                          </p>
                          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {request.unit?.unitNumber} - {request.property?.name}
                              </span>
                            </div>
                            {request.tenant && (
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>
                                  {request.tenant.firstName} {request.tenant.lastName}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(request.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {request.status === "open" && (
                            <Button 
                              onClick={() => handleStatusUpdate(request.id, "in_progress")}
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              size="sm"
                              data-testid={`request-${request.id}-start`}
                            >
                              Start Work
                            </Button>
                          )}
                          {request.status === "in_progress" && (
                            <Button 
                              onClick={() => handleStatusUpdate(request.id, "completed")}
                              className="bg-green-600 text-white hover:bg-green-700"
                              size="sm"
                              data-testid={`request-${request.id}-complete`}
                            >
                              Complete
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`request-${request.id}-view`}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Bolt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      {priorityFilter !== "all" 
                        ? `No ${priorityFilter} priority requests found`
                        : "No maintenance requests found"
                      }
                    </h3>
                    <p className="text-muted-foreground">
                      {priorityFilter !== "all"
                        ? "Try adjusting your filter criteria"
                        : "All maintenance requests will appear here"
                      }
                    </p>
                    {priorityFilter === "all" && (
                      <Button 
                        onClick={() => setShowAddModal(true)} 
                        className="mt-4"
                        data-testid="add-first-request"
                      >
                        Add Request
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddMaintenanceModal 
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </>
  );
}
