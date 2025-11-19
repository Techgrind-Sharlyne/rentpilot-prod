import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    requestedRole: "",
    businessName: "",
    businessType: "",
    reason: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const requestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/auth/request-access", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Request Submitted",
        description: "Your access request has been submitted for review. We'll contact you within 24-48 hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.requestedRole) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    requestMutation.mutate(formData);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-xl text-green-700 dark:text-green-400">
                Request Submitted Successfully!
              </CardTitle>
              <CardDescription className="text-base">
                Your access request has been received and is being reviewed by our team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>What's next?</strong>
                </p>
                <ul className="mt-2 text-blue-700 dark:text-blue-300 text-left space-y-1">
                  <li>• We'll review your request within 24-48 hours</li>
                  <li>• You'll receive an email notification about the status</li>
                  <li>• Once approved, you'll get login credentials</li>
                </ul>
              </div>
              <Link href="/login" className="w-full">
                <Button className="w-full" data-testid="back-to-login-button">
                  Back to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-8">
          <Link href="/login" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">RentFlow</span>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Request Access to RentFlow
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Fill out the form below to request access to our Real Estate Management System
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Access Request Form</CardTitle>
            <CardDescription>
              Please provide accurate information to help us process your request quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      data-testid="firstName-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      data-testid="lastName-input"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      data-testid="email-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., +254 700 123 456"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      data-testid="phone-input"
                    />
                  </div>
                </div>
              </div>

              {/* Role and Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Role & Business Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="requestedRole">Requested Role *</Label>
                  <Select value={formData.requestedRole} onValueChange={(value) => handleInputChange("requestedRole", value)}>
                    <SelectTrigger data-testid="requestedRole-select">
                      <SelectValue placeholder="Select the role you're requesting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord">Landlord - I own rental properties</SelectItem>
                      <SelectItem value="property_manager">Property Manager - I manage properties for others</SelectItem>
                      <SelectItem value="agent">Agent - I help with leasing and tenant management</SelectItem>
                      <SelectItem value="tenant">Tenant - I'm looking to rent a property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(formData.requestedRole === "landlord" || formData.requestedRole === "property_manager" || formData.requestedRole === "agent") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business/Company Name</Label>
                      <Input
                        id="businessName"
                        type="text"
                        placeholder="Your company name"
                        value={formData.businessName}
                        onChange={(e) => handleInputChange("businessName", e.target.value)}
                        data-testid="businessName-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select value={formData.businessType} onValueChange={(value) => handleInputChange("businessType", value)}>
                        <SelectTrigger data-testid="businessType-select">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual Property Owner</SelectItem>
                          <SelectItem value="property_management">Property Management Company</SelectItem>
                          <SelectItem value="real_estate">Real Estate Agency</SelectItem>
                          <SelectItem value="corporate">Corporate/Commercial</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Why do you want to use RentFlow?</Label>
                <Textarea
                  id="reason"
                  placeholder="Briefly describe your needs and how you plan to use RentFlow..."
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  data-testid="reason-textarea"
                  rows={4}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={requestMutation.isPending}
                data-testid="submit-request-button"
              >
                {requestMutation.isPending ? "Submitting Request..." : "Submit Access Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
              What happens after you submit?
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <div className="flex items-start space-x-2">
                <span className="font-medium">1.</span>
                <span>Your request will be reviewed by our administrators</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium">2.</span>
                <span>You'll receive an email notification within 24-48 hours</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium">3.</span>
                <span>Once approved, you'll get your login credentials and welcome instructions</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}