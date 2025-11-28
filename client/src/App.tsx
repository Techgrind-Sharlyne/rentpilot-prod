import React from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import LoginPage from "@/pages/login";
import OnboardingPage from "@/pages/onboarding";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/Dashboard"; // dynamic dashboard (also used by "/")
import Properties from "@/pages/properties";
import Units from "@/pages/units";
import Tenants from "@/pages/tenants";
import Financial from "@/pages/financial";
import RentIncome from "@/pages/rent-income";
import Expenditure from "@/pages/expenditure";
import Invoices from "@/pages/invoices";
import Payments from "@/pages/payments";
import RentStatus from "@/pages/rent-status";
import Maintenance from "@/pages/maintenance";
import Reports from "@/pages/reports";
import SimulatePayment from "@/pages/simulate-payment";
import NotFound from "@/pages/not-found";
import Pricing from "@/pages/pricing";

function AuthedShell() {
  const [collapsed, setCollapsed] = React.useState(false);
  const mainMargin = collapsed ? "ml-20" : "ml-64";

  // Enable idle logout for the entire authenticated shell
  useIdleLogout();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className={`${mainMargin} transition-all duration-300 min-h-screen`}
      >
        <div className="p-4">
          <ErrorBoundary>
            <Switch>
              {/* "/" and "/dashboard" both show the same dynamic page */}
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />

              <Route path="/properties" component={Properties} />
              <Route path="/units" component={Units} />
              <Route path="/tenants" component={Tenants} />
              <Route path="/financials" component={Financial} />
              <Route path="/financials/rent-income" component={RentIncome} />
              <Route path="/financials/invoices" component={Invoices} />
              <Route path="/financials/expenditure" component={Expenditure} />
              <Route path="/payments" component={Payments} />
              <Route path="/rent-status" component={RentStatus} />
              <Route path="/maintenance" component={Maintenance} />
              <Route path="/reports" component={Reports} />
              <Route path="/simulate-payment" component={SimulatePayment} />
              <Route path="/pricing" component={Pricing} />
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function GuardedRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/landing" component={Landing} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  return <AuthedShell />;
}

/**
 * Root Application Component
 * Wraps the app with React Query, Theme, Tooltip, and Toaster providers
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="rentflow-theme">
        <TooltipProvider>
          <Toaster />
          <GuardedRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
