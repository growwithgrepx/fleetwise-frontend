"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  TruckIcon,
  WrenchIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  CommandLineIcon,
  PlusCircleIcon,
  InformationCircleIcon,
  BriefcaseIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  StarIcon,
  CurrencyDollarIcon,
  WalletIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { useMediaQuery } from 'react-responsive';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useMemo } from "react";
import { roleAccessRules } from "@/config/roleAccess";
import { extractUserRole } from "@/utils/auth";

interface NavItem {
  key?: string,
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Enterprise-grade navigation structure with logical grouping
const navSections: NavSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <HomeIcon className="w-5 h-5" />, description: "Overview and analytics" },
      {
        label: "Jobs",
        href: "/jobs",
        icon: <BriefcaseIcon className="w-5 h-5" />,
        description: "Manage fleet operations",
        children: [
          { label: "Manage Jobs", href: "/jobs/manage", icon: <StarIcon className="w-4 h-4" />, description: "Cancel or re-instate jobs" },
          { label: "Jobs Audit Trail", href: "/jobs/audit-trail", icon: <ClipboardDocumentListIcon className="w-4 h-4" />, description: "View job change history" },
        ]
      },
      {
        label: "Billing",
        href: "/billing",
        icon: <CurrencyDollarIcon className="w-5 h-5" />,
        description: "Manage jobs billing",
        children: [
          { label: "Customer Billing", href: "/billing/customer-billing", icon: <DocumentDuplicateIcon className="w-4 h-4" />, description: "Customer billing management" },
        ]
      },
      {
        key: "cost_summary",
        label: "Jobs Claim",
        href: "", // Non-clickable
        icon: <WalletIcon className="w-5 h-5" />,
        description: "View cost summaries",
        children: [
          { label: "Generate Contractor Cost", href: "/billing/contractor-billing", icon: <WalletIcon className="w-4 h-4" />, description: "Generate contractor costs" },
          { label: "Generate Driver Claim", href: "/billing/driver-billing", icon: <WalletIcon className="w-4 h-4" />, description: "Generate driver claims" },
        ]
      },
    ]
  },
  {
    title: "People",
    items: [
      {
        label: "Drivers",
        href: "/drivers",
        icon: <UsersIcon className="w-5 h-5" />,
        description: "Driver management"
      },
      { label: "Customers", href: "/customers", icon: <UserGroupIcon className="w-5 h-5" />, description: "Customer database" },
      { label: "Contractors", href: "/contractors", icon: <WalletIcon className="w-5 h-5" />, description: "Contractor management" },
      // Modified Leave Management section to be clickable and link to Apply Leave directly
      {
        label: "Leave Management",
        href: "/drivers/leave/apply", // Clicking this will go directly to Apply Leave
        icon: <DocumentDuplicateIcon className="w-5 h-5" />,
        description: "Apply for driver leave",
        // Removed Apply Leave from children since it's now the main link
        children: [
          { label: "Leave History", href: "/drivers/leave/history", icon: <ClipboardDocumentListIcon className="w-4 h-4" />, description: "View leave history" },
        ]
      },
    ] 
  },
  {
    title: "Assets",
    items: [
      { label: "Vehicles", href: "/vehicles", icon: <TruckIcon className="w-5 h-5" />, description: "Fleet management" },
      { label: "Vehicle Types", href: "/vehicle-types", icon: <TruckIcon className="w-5 h-5" />, description: "Vehicle type management" },
      //{ label: "Services", href: "/services", icon: <WrenchScrewdriverIcon className="w-5 h-5" />, description: "Service catalog" },
      { label: "Services", href: "/services-vehicle-price", icon: <CurrencyDollarIcon className="w-5 h-5" />, description: "Service management" },
    ]
  },
  {
    title: "Reports",
    items: [
      { label: "Driver Job History", href: "/reports/driver", icon: <ClipboardDocumentListIcon className="w-5 h-5" />, description: "View driver job history reports" }
    ]
  },
  {
    title: "Settings",
    items: [
      { label: "General", href: "/general-settings", icon: <Cog6ToothIcon className="w-5 h-5" />, description: "System settings" }
      // Removed User Profile from Settings menu
    ]
  }
];

export default function MainNavigation({
  onSidebarStateChange
}: { onSidebarStateChange?: (state: { isCollapsed: boolean; isMobileOpen: boolean }) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false); // Default to expanded
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isDesktop = useMediaQuery({ query: '(min-width: 768px)' });
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useUser();

const [blockedNav, setBlockedNav] = useState<string[]>([]); 
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetch("/api/navigation", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      setBlockedNav(data.blockedNav ?? []); // null-safe
      setIsLoading(false);
    })
    .catch(() => {
      // Network or API failure – safest fallback
      setBlockedNav([]); 
      setIsLoading(false);
    });
}, []);

const isBlocked = (href: string): boolean => {
  // During loading, block everything
  if (isLoading) return true;
  return matchesAny(blockedNav, href);
};


// --- utils ---
const normalize = (path: string) => {
  const withoutQuery = (path || "").split("?")[0];
  // Preserve root path exactly as "/"
  if (withoutQuery === "/") return "/";
  // Remove trailing slashes from all other paths
  return withoutQuery.replace(/\/+$/, "");
};


const matchesAny = (patterns: string[], href: string) => {
  const cleanHref = normalize(href);
  return patterns.some((p) => {
    const pat = normalize(p);

    // wildcard support: "/jobs/*" blocks "/jobs" and any subpath
    if (pat.endsWith("/*")) {
  const base = pat.slice(0, -2);
  // Wildcard: block the base path and all its descendants
  return cleanHref === base || cleanHref.startsWith(`${base}/`);
}

// Non-wildcard: only block exact path
return cleanHref === pat;

  });
};

// const isBlocked = (href: string): boolean =>
//   matchesAny(blockedNav || [], href);

// --- filter nav (supports children) ---
const visibleSections = navSections
  .map((section) => ({
    ...section,
    items: section.items
  ?.map((item) => ({
    ...item,
    children: item.children?.filter((child) => !isBlocked(child.href)),
  }))
  .filter((item) => {
    if (isBlocked(item.href)) return false;
    if (Array.isArray(item.children)) {
      return item.children.length > 0;
    }
    return true;
  }),
  }))
  .filter((section) => section.items && section.items.length > 0);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
 // base expansion logic from pathname
const computedMenus = useMemo(() => {
  const next: Record<string, boolean> = {};

  // Example: expand "Jobs" if pathname starts with /jobs
  if (pathname.startsWith("/jobs")) next["Jobs"] = true;
  if (pathname.startsWith("/billing") && !pathname.startsWith("/billing/contractor-billing") && !pathname.startsWith("/billing/driver-billing")) next["Billing"] = true;
  // Use the label as the key for Cost Summary
  if (pathname.startsWith("/billing/contractor-billing") || pathname.startsWith("/billing/driver-billing")) next["cost_summary"] = true;
  // Expand Leave Management menu for leave pages (instead of Drivers)
  if (pathname.startsWith("/drivers/leave")) next["Leave Management"] = true;

  return next;
}, [pathname]);


// track only user overrides
const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});

// final menu state combines both
const finalMenuState = { ...computedMenus, ...manualOverrides };



  // Memoized callbacks for better performance
  const handleToggleSidebar = useCallback(() => {
    setIsTransitioning(true);
    if (isDesktop) {
      setIsCollapsed(!isCollapsed);
    } else {
      setIsMobileOpen(!isMobileOpen);
    }
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isDesktop, isCollapsed, isMobileOpen]);

  const handleMobileClose = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isMobileOpen) {
      handleMobileClose();
    }
  }, [isMobileOpen, handleMobileClose]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (onSidebarStateChange) onSidebarStateChange({ isCollapsed, isMobileOpen });
  }, [isCollapsed, isMobileOpen, onSidebarStateChange]);

  useEffect(() => {
    if (isDesktop) {
      setIsMobileOpen(false);
    } else {
      setIsCollapsed(false);
    }
  }, [isDesktop]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const isActive = (href: string) => {
    if (!href) return false;
    // For main billing page, ensure we don't match child routes
    if (href === "/billing") {
      return pathname === "/billing" || pathname === "/billing/";
    }
    // Special handling for Drivers to avoid matching leave routes
    if (href === "/drivers") {
      return pathname === "/drivers" || pathname === "/drivers/" || 
             (pathname.startsWith("/drivers") && !pathname.startsWith("/drivers/leave"));
    }
    return pathname?.startsWith(href) ?? false;
  };

 // toggle just updates manualOverrides
const toggleMenu = (key: string) => {
  setManualOverrides((m) => ({ ...m, [key]: !m[key] }));
};


  const SidebarContent = () => (
    <div
      className="flex flex-col h-full bg-background shadow-xl border-r border-border-color"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-color h-16 min-h-16 bg-background-light/30">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mr-3 shadow-sm">
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-text-main leading-tight">FleetOps</span>
              <span className="text-xs text-text-secondary">Management Portal</span>
            </div>
          </div>
        )}
        <button
          onClick={handleToggleSidebar}
          className={clsx(
            "p-2 rounded-lg text-text-secondary hover:bg-background-light hover:text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-200",
            isTransitioning && "pointer-events-none"
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          disabled={isTransitioning}
        >
          {isCollapsed ? <Bars3Icon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-border-color scrollbar-track-transparent">
        <div className="flex-1 space-y-8">
          {visibleSections.map((section, sectionIndex) => (
            <div key={section.title} className="space-y-3">
              {/* Section Title - Only show when expanded */}
              {!isCollapsed && (
                <div className="px-4">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
              )}

              {/* Section Items */}
         <div className="space-y-1">
  {section.items.map((item) => {
    // More precise active state detection
    const parentActive = item.href !== "" && 
      (pathname === item.href || 
       (pathname.startsWith(item.href) && 
        !item.children?.some(c => pathname.startsWith(c.href)) &&
        // Special handling for Billing to avoid matching child routes
        !(item.href === "/billing" && 
          (pathname.startsWith("/billing/contractor-billing") || 
           pathname.startsWith("/billing/driver-billing"))) &&
        // Special handling for Drivers to avoid matching leave routes
        !(item.href === "/drivers" && pathname.startsWith("/drivers/leave"))
       )
      );
    
    const anyChildActive = item.children?.some((c) => pathname.startsWith(c.href));
    // For Cost Summary, we don't want to highlight the parent when children are active
    const isCostSummaryActive = item.key === "cost_summary" && parentActive; // Only highlight if directly on the parent (which is never since it's non-clickable)
    const open = finalMenuState[item.label] ?? anyChildActive;

    // CASE 1: item with children (collapsible group)
    if ('children' in item && Array.isArray(item.children)) {
  // const open = finalMenuState[item.href];   
  // const anyChildActive = item.children.some(c => isActive(c.href));
  // const activeOrChild = parentActive || anyChildActive;

        return (
      <div key={item.href} className="mx-2">
        {/* Check if item is non-clickable (no href) */}
        {item.href === "" ? (
          // Non-clickable header
          <div
            className={clsx(
              "flex items-center rounded-xl transition-all duration-200 relative overflow-hidden cursor-default",
              isCostSummaryActive
                ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                : "text-text-secondary bg-background-light/50",
              isCollapsed && "justify-center"
            )}
          >
            <div className={clsx(
              "flex items-center flex-1 px-4 py-3",
              isCollapsed && "justify-center"
            )}>
              <div className="flex items-center justify-center">
                {item.icon}
              </div>
              {!isCollapsed && (
                <div className="ml-3 flex-1 text-left">
                  <span className="font-medium text-sm block">{item.label}</span>
                  <span className="text-xs block mt-0.5 text-text-secondary/60">
                    {item.description}
                  </span>
                </div>
              )}
            </div>

            {/* Chevron for expand */}
            {!isCollapsed && (
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleMenu(item.label); }}
                className="px-3 py-3 rounded-r-xl hover:bg-white/10 focus:outline-none"
                aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
                aria-expanded={open}
                aria-controls={`submenu-${item.label}`}
              >
                {open ? <ChevronDownIcon className="w-4 h-4 opacity-90" /> : <ChevronRightIcon className="w-4 h-4 opacity-90" />}
              </button>
            )}
          </div>
        ) : (
          // Clickable parent item
          <div
            className={clsx(
              "flex items-center rounded-xl transition-all duration-200 relative overflow-hidden",
              parentActive
                ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                : "text-text-secondary hover:bg-background-light hover:text-text-main hover:shadow-sm",
              isCollapsed && "justify-center"
            )}
          >
            {/* Parent link */}
            <Link
              href={item.href}
              onClick={() => !isDesktop && handleMobileClose()}
              className={clsx(
                "flex items-center flex-1 px-4 py-3 focus:outline-none",
                isCollapsed && "justify-center"
              )}
              aria-current={parentActive ? "page" : undefined}
              title={isCollapsed ? `${item.label} - ${item.description}` : ""}
            >
              {parentActive && isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
              <div className={clsx("flex items-center", !isCollapsed && "w-full")}>
                <div className={clsx(
                  "flex items-center justify-center",
                  parentActive ? "text-white" : "group-hover:scale-110 transition-transform duration-200"
                )}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <div className="ml-3 flex-1 text-left">
                    <span className="font-medium text-sm block">{item.label}</span>
                    <span className={clsx(
                      "text-xs block mt-0.5",
                      parentActive ? "text-white/80" : "text-text-secondary/60"
                    )}>
                      {item.description}
                    </span>
                  </div>
                )}
              </div>
            </Link>

            {/* Chevron for expand */}
            {!isCollapsed && (
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleMenu(item.label); }}
                className="px-3 py-3 rounded-r-xl hover:bg-white/10 focus:outline-none"
                aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
                aria-expanded={open}
                aria-controls={`submenu-${item.label}`}
              >
                {open ? <ChevronDownIcon className="w-4 h-4 opacity-90" /> : <ChevronRightIcon className="w-4 h-4 opacity-90" />}
              </button>
            )}
          </div>
        )}

        {/* Submenu */}
        {!isCollapsed && (
          <div
            id={`submenu-${item.label}`}
            className={clsx(
              "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
              open ? "max-h-80 opacity-100 mt-1" : "max-h-0 opacity-0"
            )}
          >
            <ul className="pl-10 pr-2 py-1 space-y-1">
              {item.children.map((child) => {
                const childActive = pathname?.startsWith(child.href) ?? false;
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={() => !isDesktop && handleMobileClose()}
                      className={clsx(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                        childActive
                          ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                          : "text-text-secondary hover:bg-background-light hover:text-text-main"
                      )}
                      aria-current={childActive ? "page" : undefined}
                    >
                      <span className={clsx(childActive ? "text-white" : "text-text-secondary/80")}>
                        {child.icon}
                      </span>
                      <span className="truncate">{child.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

    // CASE 2: simple leaf item (no children)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => !isDesktop && handleMobileClose()}
        className={clsx(
          "group flex items-center px-4 py-3 mx-2 rounded-xl transition-all duration-200 relative overflow-hidden",
          isActive(item.href)
            ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
            : "text-text-secondary hover:bg-background-light hover:text-text-main hover:shadow-sm",
          isCollapsed && "justify-center mx-2",
          isActive(item.href) && isCollapsed && "bg-primary text-white"
        )}
        title={isCollapsed ? `${item.label} - ${item.description}` : ''}
        aria-current={isActive(item.href) ? 'page' : undefined}
      >
        {isActive(item.href) && isCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}

        <div className={clsx("flex items-center", !isCollapsed && "w-full")}>
          <div className={clsx(
            "flex items-center justify-center",
            isActive(item.href) ? "text-white" : "group-hover:scale-110 transition-transform duration-200"
          )}>
            {item.icon}
          </div>
          {!isCollapsed && (
            <div className="ml-3 flex-1">
              <span className="font-medium text-sm block">{item.label}</span>
              <span className={clsx("text-xs block mt-0.5",
                isActive(item.href) ? "text-white/80" : "text-text-secondary/60")}>
                {item.description}
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  })}
</div>

            </div>
          ))}
        </div>
      </nav>

        {/* Footer - User Actions */}
      <div className="border-t border-border-color p-4 space-y-4 bg-background-light/20">
        {/* User Information */}
            <div className="flex items-center px-2 py-2 rounded-lg bg-background-light/50">
            {!isCollapsed && user && (() => {
          // Improved extraction of user data with better error handling
          try {
            const userData = user.response?.user || user.user || user || {};
            const userName = userData.name || userData.username || userData.email || userData.email_id || 'User';
            const userEmail = userData.email || userData.email_id || '';
            const roles = userData.roles || userData.response?.roles || [];
            const normalizedRoles = Array.isArray(roles) ? roles : (roles ? [roles] : []);
            const roleNames = normalizedRoles
              .map((role: any) => {
                if (typeof role === 'string') return role;
                return role?.name || role?.role || role?.title || '';
              })
              .filter(Boolean)
              .join(', ') || 'User';
            
            return (
              <>
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center cursor-pointer"
                  onClick={() => router.push('/user-settings')}
                >
                  <span className="text-white font-medium text-sm">
                    {userName.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div 
                  className="ml-3 overflow-hidden cursor-pointer"
                  onClick={() => router.push('/user-settings')}
                >
                  <p className="text-sm font-medium text-text-main truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {roleNames}
                  </p>
                </div>
              </>
            );
          } catch (error) {
            console.error('Error extracting user data:', error);
            // Fallback to static display if there's an error
            return (
              <>
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center cursor-pointer"
                  onClick={() => router.push('/user-settings')}
                >
                  <span className="text-white font-medium text-sm">U</span>
                </div>
                <div 
                  className="ml-3 overflow-hidden cursor-pointer"
                  onClick={() => router.push('/user-settings')}
                >
                  <p className="text-sm font-medium text-text-main truncate">
                    User
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    User Role
                  </p>
                </div>
              </>
            );
          }
        })()}
              <div className="ml-auto">
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={clsx(
                  "flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-text-secondary hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background group",
                  isCollapsed && "justify-center"
                )}
                title="Sign out of your account"
                aria-label="Sign out of your account"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              </button>
            </div>
            </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <span className="text-xs text-text-secondary font-medium">Appearance</span>
          )}
          <button
            onClick={toggleTheme}
            className={clsx(
              "flex items-center justify-center rounded-xl bg-background-light text-text-main hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 shadow-sm",
              isCollapsed ? "w-10 h-10" : "px-3 py-2.5"
            )}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={isCollapsed ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : ''}
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
            {!isCollapsed && (
              <span className="ml-2 text-sm font-medium">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (!hasMounted) return null;

  if (isDesktop) {
    return (
      <aside
        className={clsx(
          "text-text-main transition-all duration-300 ease-in-out flex flex-col bg-background shadow-xl border-r border-border-color fixed left-0 top-0 h-full z-30",
          isCollapsed ? "w-20" : "w-72"
        )}
        role="complementary"
        aria-label="Main navigation sidebar"
      >
        <SidebarContent />
      </aside>
    )
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={handleToggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-background/80 backdrop-blur-lg text-text-main shadow-lg border border-border-color focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200"
        aria-label="Open navigation menu"
        aria-expanded={isMobileOpen}
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 transition-all duration-300 ease-in-out",
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleMobileClose}
          aria-hidden="true"
        />

{/* Sidebar */}
<aside
  className={clsx(
    "absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-background shadow-2xl border-r border-border-color transition-transform duration-300 ease-in-out",
    isMobileOpen ? "translate-x-0" : "-translate-x-full"
  )}
  aria-label="Mobile navigation menu"
  role="dialog"
>
  <SidebarContent />
</aside>
      </div>
    </>  );
}