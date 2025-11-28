// client/src/components/layout/AppShell.tsx
import { ReactNode } from "react";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { AuthGuard } from "@/components/auth/AuthGuard";

type AppShellProps = {
  children: ReactNode;
  /**
   * For public pages like /login or /onboarding, set requireAuth={false}
   * so they don't get wrapped in <AuthGuard>.
   */
  requireAuth?: boolean;
};

/**
 * AppShell:
 * - Globally wires useIdleLogout() so inactivity logs the user out.
 * - Optionally enforces auth via <AuthGuard>.
 *
 * Typical usage:
 *   <AppShell requireAuth>
 *     <YourPrivateLayoutAndRoutes />
 *   </AppShell>
 *
 * For login/onboarding:
 *   <AppShell requireAuth={false}>
 *     <LoginPage />
 *   </AppShell>
 */
export function AppShell({ children, requireAuth = true }: AppShellProps) {
  // Enable idle logout for all pages that use this shell
  useIdleLogout();

  if (requireAuth) {
    return (
      <AuthGuard>
        {children}
      </AuthGuard>
    );
  }

  return <>{children}</>;
}
