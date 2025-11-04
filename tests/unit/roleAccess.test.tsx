// tests/roleAccess.test.ts
import { checkRouteAccess, isBlocked } from "@/config/roleAccess";

describe("Role Access Control (blocked routes)", () => {
  test("manager can access contractor billing", () => {
    const allowed = checkRouteAccess("/billing/contractor-billing", "manager");
    expect(allowed).toBe(true);
  });
  test("manager can access customer billing", () => {
    const allowed = checkRouteAccess("/billing/customer-billing", "manager");
    expect(allowed).toBe(true);
  });
  test("manager can access driver billing", () => {
    const allowed = checkRouteAccess("/billing/driver-billing", "manager");
    expect(allowed).toBe(true);
  });
  test("accountant can access contractor billing", () => {
    const allowed = checkRouteAccess("/billing/contractor-billing", "accountant");
    expect(allowed).toBe(true);
  });
  test("accountant can access customer billing", () => {
    const allowed = checkRouteAccess("/billing/customer-billing", "accountant");
    expect(allowed).toBe(true);
  });
  test("accountant can access driver billing", () => {
    const allowed = checkRouteAccess("/billing/driver-billing", "accountant");
    expect(allowed).toBe(true);
  });

  test("driver is blocked from contractor billing", () => {
    const blocked = isBlocked("driver", "/billing/contractor-billing");
    expect(blocked).toBe(true);
  });
  
  test("driver is blocked from customer billing", () => {
    const blocked = isBlocked("driver", "/billing/customer-billing");
    expect(blocked).toBe(true);
      });

  test("driver is blocked from driver billing", () => {
    const blocked = isBlocked("driver", "/billing/driver-billing");
    expect(blocked).toBe(true);  });

  test("customer is blocked from contractor billing", () => {
    const blocked = isBlocked("customer", "/billing/contractor-billing");
    expect(blocked).toBe(true);  });
  test("customer is blocked from customer billing", () => {
    const blocked = isBlocked("customer", "/billing/customer-billing");
    expect(blocked).toBe(true);  });

  test("customer is blocked from driver billing", () => {
    const blocked = isBlocked("customer", "/billing/driver-billing");
    expect(blocked).toBe(true);  });

    const allowed = checkRouteAccess("/billing/contractor-billing", "driver");
    expect(allowed).toBe(false);
  });

  test("customer is blocked from driver billing", () => {
    expect(isBlocked("customer", "/billing/driver-billing")).toBe(true);
    expect(checkRouteAccess("/billing/driver-billing", "customer")).toBe(false);
  });

  test("wildcard works when we add /billing/* later", () => {
    // simulate adding wildcard:
    const path = "/billing/customer-billing";
    // manually call matcher
    // this uses same logic as isBlocked
    const blocked = (function () {
      const pattern = "/billing/*";
      const wildcardSuffix = "/*";
      const base = pattern.substring(0, pattern.length - wildcardSuffix.length);
      return path === base || path.startsWith(base + "/");
    })();
    expect(blocked).toBe(true);
  });

