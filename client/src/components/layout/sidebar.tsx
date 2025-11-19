import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Building,
  LayoutDashboard,
  Users,
  DollarSign,
  Wrench,
  FileText,
  CreditCard,
  Receipt,
  Home,
  Zap,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type SidebarProps = {
  /** optional external collapse control */
  collapsed?: boolean;
  onToggle?: () => void;
};

/* ---------- tokens ---------- */
const SURFACE = "bg-white dark:bg-[#0f1115]";
const DIVIDER = "border-r border-slate-200 dark:border-slate-800";
const LABEL = "text-slate-700 dark:text-slate-200";
const SUBTLE = "text-slate-500 dark:text-slate-400";
const ICON = "text-slate-600 dark:text-slate-300";
const HOVER_PANEL = "hover:bg-slate-100 dark:hover:bg-slate-800/70";
const ACTIVE_PILL = "bg-[#1a73e8] text-white"; // Google blue
const ACTIVE_ICON = "text-white";

/* ---------- nav model ---------- */
const navigationItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  {
    name: "Financials",
    icon: DollarSign,
    subItems: [
      { name: "Rent Income", href: "/financials/rent-income", icon: DollarSign },
 
      { name: "Expenditure", href: "/financials/expenditure", icon: FileText },
    ],
  },
  {
    name: "Property",
    icon: Building,
    subItems: [
      { name: "Properties", href: "/properties", icon: Building },
      { name: "Units", href: "/units", icon: Home },
  
      { name: "Maintenance", href: "/maintenance", icon: Wrench },
    ],
  },
  { name: "Tenants", href: "/tenants", icon: Users },

];

export function Sidebar(props: SidebarProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // internal collapse if parent doesn't control it
  const [collapsedLocal, setCollapsedLocal] = useState(false);
  const collapsed = props.collapsed ?? collapsedLocal;

  const [expanded, setExpanded] = useState<string[]>(["Property", "Financials"]);

  const logoutMutation = useMutation({
    mutationFn: async () => apiRequest("GET", "/api/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Logged out", description: "You have been logged out successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Logout failed", description: error?.message || "Failed to logout. Please try again.", variant: "destructive" });
    },
  });

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  const activeParents = useMemo(
    () => new Set(navigationItems.filter(i => i.subItems?.some(s => isActive(s.href))).map(i => i.name)),
    [location]
  );

  const toggleMenu = (name: string) =>
    setExpanded(prev => (prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]));

  const handleToggle = () => {
    if (props.onToggle) props.onToggle();
    else setCollapsedLocal(v => !v);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen flex flex-col transition-[width] duration-300",
        SURFACE,
        DIVIDER,
        collapsed ? "w-20" : "w-72"
      )}
      role="navigation"
      aria-label="Sidebar"
    >
      {/* TOP BAR: logo + collapse toggle */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-sm bg-[#1a73e8]" />
          {!collapsed && <span className={cn("text-sm font-medium", LABEL)}>REMS</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={handleToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* NAV LIST */}
      <TooltipProvider delayDuration={120}>
        <nav className="flex-1 overflow-y-auto py-3">
          {navigationItems.map(item => {
            const parentActive = activeParents.has(item.name) || isActive(item.href);

            // --- collapsed rendering: icon-only buttons with tooltips ---
            if (collapsed) {
              if (!item.subItems) {
                const content = (
                  <div
                    className={cn(
                      "mx-2 my-1 h-10 w-10 rounded-full flex items-center justify-center",
                      parentActive ? ACTIVE_PILL : HOVER_PANEL
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", parentActive ? ACTIVE_ICON : ICON)} />
                  </div>
                );
                return (
                  <div key={item.name} className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={item.href || "#"}>{content}</Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    </Tooltip>
                  </div>
                );
              }

              // parent with children (collapsed) -> still show icon-only, tooltip lists children
              const parentButton = (
                <div
                  className={cn(
                    "mx-2 my-1 h-10 w-10 rounded-full flex items-center justify-center",
                    parentActive ? ACTIVE_PILL : HOVER_PANEL
                  )}
                >
                  <item.icon className={cn("h-5 w-5", parentActive ? ACTIVE_ICON : ICON)} />
                </div>
              );

              return (
                <div key={item.name} className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label={item.name}>{parentButton}</button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="p-0">
                      <div className="min-w-[220px] p-2">
                        <div className="px-3 py-2 text-sm font-medium">{item.name}</div>
                        {item.subItems.map(sub => (
                          <Link key={sub.name} href={sub.href}>
                            <div className={cn("px-3 py-2 text-sm rounded-md", HOVER_PANEL, LABEL)}>{sub.name}</div>
                          </Link>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            }

            // --- expanded rendering: rounded pill rows like Google Ads ---
            const rowClasses = cn(
              "mx-3 my-1 px-4 py-3 rounded-full text-sm flex items-center justify-between",
              parentActive ? ACTIVE_PILL : [HOVER_PANEL, LABEL]
            );

            if (!item.subItems) {
              return (
                <Link key={item.name} href={item.href || "#"}>
                  <div className={rowClasses}>
                    <span className="flex items-center gap-3">
                      <item.icon className={cn("h-5 w-5", parentActive ? ACTIVE_ICON : ICON)} />
                      <span>{item.name}</span>
                    </span>
                  </div>
                </Link>
              );
            }

            const isOpen = expanded.includes(item.name);

            return (
              <div key={item.name} className="select-none">
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={rowClasses}
                  aria-expanded={isOpen}
                  aria-controls={`ads-sub-${item.name}`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5", parentActive ? ACTIVE_ICON : ICON)} />
                    <span>{item.name}</span>
                  </span>
                  {isOpen ? (
                    <ChevronDown className={cn("h-4 w-4", parentActive ? ACTIVE_ICON : ICON)} />
                  ) : (
                    <ChevronRight className={cn("h-4 w-4", ICON)} />
                  )}
                </button>

                <div
                  id={`ads-sub-${item.name}`}
                  className={cn(
                    "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
                    isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="pl-10 pr-4 mt-1">
                    {item.subItems.map(sub => {
                      const active = isActive(sub.href);
                      return (
                        <Link key={sub.name} href={sub.href}>
                          <div
                            className={cn(
                              "my-1 px-4 py-2 rounded-full text-sm",
                              active ? ACTIVE_PILL : [HOVER_PANEL, LABEL]
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <sub.icon className={cn("h-4 w-4", active ? ACTIVE_ICON : ICON)} />
                              <span>{sub.name}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* FOOTER: user + theme + logout */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <Building className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className={cn("text-sm font-medium leading-tight", LABEL)}>
                {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}
              </div>
              <div className={cn("text-xs", SUBTLE)}>{user?.email ?? "user@example.com"}</div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Sun className="h-4 w-4 text-slate-700" />
              ) : (
                <Moon className="h-4 w-4 text-slate-200" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => logoutMutation.mutate()}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
