export const roleAccessRules: Record<string, string[]> = {
  admin: [],
  manager: ["/general-settings", "/dashboard",],
  accountant: [
    "/dashboard",
    "/general-settings",
  ],
  customer: [
    "/dashboard",
    "/billing",
    "/drivers",
    "/customers",
    "/contractors",
    "/vehicles",
    "/vehicle-types",
    "/general-settings",
    "/services-vehicle-price",
    "/jobs/manage",
    "/billing/*",
    "/reports/driver",
  ],
  driver: [
    "/dashboard",
    "/billing",
    "/drivers",
    "/customers",
    "/contractors",
    "/vehicles",
    "/vehicle-types",
    "/general-settings",
    "/services-vehicle-price",
    "/jobs/new",
    "/jobs/bulk-upload",
    "/jobs/manage",
    "/billing/*",
  ],
  guest: [
    "/dashboard",
    "/billing",
    "/drivers",
    "/customers",
    "/contractors",
    "/vehicles",
    "/vehicle-types",
    "/general-settings",
    "/services-vehicle-price",
    "/jobs",
    "/jobs/new",
    "/jobs/bulk-upload",
    "/jobs/manage",
    "/jobs/*",
  ]
};

function matchesPattern(path: string, pattern: string): boolean {
  const wildcardSuffix = "/*";
  if (pattern.endsWith(wildcardSuffix)) {
    const base = pattern.substring(0, pattern.length - wildcardSuffix.length);
    // match /billing and /billing/... 
    return path === base || path.startsWith(base + "/");
  }
  // exact match
  return path === pattern;
}

// returns true when the route is BLOCKED for that role
export function isBlocked(role: string, path: string): boolean {
  const rules = roleAccessRules[role] ?? roleAccessRules["guest"];
  return rules.some((pattern) => matchesPattern(path, pattern));
}

// returns true when the route is ALLOWED for that role
export function checkRouteAccess(path: string, role: string): boolean {
  return !isBlocked(role, path);
}