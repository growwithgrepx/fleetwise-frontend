export const roleAccessRules: Record<string, string[]> = {
  admin: [],
  manager: ["/billing", "/general-settings"],
  accountant: [
    "/general-settings",
    "/drivers",
    "/customers",
    "/contractors",
    "/vehicles",
    "/vehicle-types",
    "/jobs/manage",
    "/jobs/audit-trail",
    "/billing"
  ],
  customer: [
    "/billing",
    "/drivers",
    "/customers",
    "/contractors",
    "/vehicles",
    "/vehicle-types",
    "/general-settings",
    "/jobs/manage",
    "/jobs/audit-trail"
  ],
  driver: [
    "/billing",
    "/drivers",
    "/customers",
    "/contractors",
    "/vehicles",
    "/vehicle-types",
    "/general-settings",
    "/jobs/manage",
    "/jobs/audit-trail"
  ],
  guest: [
    "/billing",
    "/drivers",
    "/customers",
    "/contractors",
    "/vehicles",
    "/vehicle-types",
    "/general-settings",
    "/jobs/manage",
    "/jobs/audit-trail"
  ]
};
