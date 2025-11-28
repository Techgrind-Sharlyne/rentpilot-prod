// client/src/pages/login.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Building } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type LoginInput = { username: string; password: string };

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  // add other fields here if your /api/auth/login returns more
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: LoginInput) => {
      // 🔐 Use the shared API helper (keeps credentials: "include")
      return apiRequest<AuthUser>("POST", "/api/auth/login", {
        username,
        password,
      });
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome back!",
        description: `Logged in successfully as ${user.firstName} ${user.lastName}`,
      });

      // Seed auth cache immediately so useAuth() can read it
      queryClient.setQueryData(["/api/auth/user"], user);

      // Refetch only key dashboard queries, not everything
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/recent-payments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/maintenance-requests"],
      });

      // Navigate to the main dashboard
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description:
          error?.payload?.message ||
          error?.message ||
          "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                RentFlow
              </span>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Sign in to your account
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access the Real Estate Management System
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="username-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="password-input"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="login-button"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  New to RentFlow?
                </span>
              </div>
            </div>

            <Link href="/onboarding" className="w-full">
              <Button
                variant="outline"
                className="w-full"
                data-testid="get-started-button"
              >
                Get Started - Request Access
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
