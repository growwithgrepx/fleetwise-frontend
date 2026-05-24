// Define route configuration
export const ROUTE_CONFIG = {
  jobs: {
    base: '/jobs',
    dashboards: ['/jobs/dashboard/customer'],
  },
  drivers: {
    base: '/drivers',
    exclude: ['/drivers/leave'],
  },
  billing: {
    base: '/billing',
    exclude: ['/billing/contractor-billing', '/billing/driver-billing'],
  },
  // Easy to extend with new routes
  driversLeave: {
    base: '/drivers/leave',
  },
  customers: {
    base: '/customers',
  },
  contractors: {
    base: '/contractors',
  },
  vehicles: {
    base: '/vehicles',
  },
  vehicleTypes: {
    base: '/vehicle-types',
  },
  services: {
    base: '/services-vehicle-price',
  },
  reports: {
    base: '/reports',
  },
  settings: {
    base: '/general-settings',
  },
  dashboard: {
    base: '/dashboard',
  },
};

// Helper functions
export const isJobsBasePath = (pathname: string): boolean => {
  if (!pathname.startsWith(ROUTE_CONFIG.jobs.base)) return false;
  // Check if it's a dashboard path
  const isDashboard = ROUTE_CONFIG.jobs.dashboards.some(dashboard => 
    pathname.startsWith(dashboard)
  );
  // Return true only for base jobs, not dashboards
  return !isDashboard;
};

export const isDriversBasePath = (pathname: string): boolean => {
  if (!pathname.startsWith(ROUTE_CONFIG.drivers.base)) return false;
  // Check if it's an excluded path
  const isExcluded = ROUTE_CONFIG.drivers.exclude.some(exclude => 
    pathname.startsWith(exclude)
  );
  // Return true only for base drivers, not excluded paths
  return !isExcluded;
};

export const isBillingBasePath = (pathname: string): boolean => {
  if (!pathname.startsWith(ROUTE_CONFIG.billing.base)) return false;
  // Check if it's an excluded path
  const isExcluded = ROUTE_CONFIG.billing.exclude.some(exclude => 
    pathname.startsWith(exclude)
  );
  // Return true only for base billing, not excluded paths
  return !isExcluded;
};

export const isPathActive = (href: string, pathname: string): boolean => {
  if (!href) return false;
  
  // Special handling for customer billing page
  if (href === "/billing/customer-billing") {
    return pathname === "/billing/customer-billing" || pathname === "/billing/customer-billing/";
  }
  
  // Special handling for drivers to avoid matching leave routes
  if (href === "/drivers") {
    return isDriversBasePath(pathname);
  }
  
  // Special handling for jobs to avoid matching customer dashboard
  if (href === "/jobs") {
    return isJobsBasePath(pathname);
  }
  
  return pathname?.startsWith(href) ?? false;
};

export const isParentActive = (
  href: string, 
  pathname: string, 
  children?: Array<{ href: string }>
): boolean => {
  if (!href) return false;
  
  const directMatch = pathname === href || 
    (pathname.startsWith(href) && 
     !children?.some(c => pathname.startsWith(c.href)));
  
  // Apply special handling for routes that need exclusions
  if (href === "/billing/customer-billing") {
    return directMatch && !pathname.startsWith("/billing/contractor-billing") && !pathname.startsWith("/billing/driver-billing");
  }
  
  if (href === "/drivers") {
    return directMatch && !pathname.startsWith("/drivers/leave");
  }
  
  if (href === "/jobs") {
    return directMatch && !pathname.startsWith("/jobs/dashboard/customer");
  }
  
  return directMatch;
};

export const isAnyChildActive = (
  children: Array<{ href: string }>,
  pathname: string,
  parentHref: string
): boolean => {
  if (!children || children.length === 0) return false;
  
  // Special handling for jobs - don't count customer dashboard as a child
  if (parentHref === "/jobs") {
    return children.some(child => 
      pathname.startsWith(child.href) && 
      !pathname.startsWith("/jobs/dashboard/customer")
    );
  }
  
  return children.some(child => pathname.startsWith(child.href));
};