// client/src/components/auth/AuthGuard.tsx
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

type AuthGuardProps = {
  children: ReactNode;
};

/**
 * AuthGuard:
 * - If useAuth().user is null → redirect to /login and render nothing.
 * - If user exists → render children.
 *
 * This assumes your login page lives at "/login".
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If not authenticated and not already on /login, push them there.
    if (!user && location !== "/login") {
      setLocation("/login");
    }
  }, [user, location, setLocation]);

  if (!user && location !== "/login") {
    // Block private UI from rendering at all while we redirect.
    return null;
  }

  return <>{children}</>;
}
