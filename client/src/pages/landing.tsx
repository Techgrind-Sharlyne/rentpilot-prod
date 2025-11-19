import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Key, Shield, Users } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">REMS</h1>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Real Estate Management
            <span className="text-blue-600 dark:text-blue-400"> Simplified</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Streamline your property management, tenant relations, and financial operations 
            with our comprehensive real estate management system.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="px-8 py-3 text-lg font-semibold"
            data-testid="button-login"
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <CardHeader>
              <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <CardTitle className="text-xl">Property Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Manage multiple properties, units, and track occupancy rates with detailed analytics.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <CardTitle className="text-xl">Tenant Relations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Handle tenant applications, lease agreements, and communication in one place.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <CardTitle className="text-xl">Financial Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Automated billing, payment tracking, and comprehensive financial reporting.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Role-based Access */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Role-Based Access Control
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-red-100 dark:bg-red-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Key className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Super Admin</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Full system access</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Landlord</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Property ownership</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Property Manager</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Day-to-day operations</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Tenant</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Personal portal</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Ready to streamline your real estate management?
          </h3>
          <Button 
            onClick={handleLogin}
            size="lg"
            variant="outline"
            className="px-8 py-3 text-lg font-semibold"
            data-testid="button-login-cta"
          >
            Sign In Now
          </Button>
        </div>
      </div>
    </div>
  );
}