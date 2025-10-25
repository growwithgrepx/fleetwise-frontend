import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { roleAccessRules } from "@/config/roleAccess"; 


function isBlocked(role: string, path: string) {
  const rules = roleAccessRules[role] || roleAccessRules["guest"];
  return rules.some(pattern =>
    pattern.endsWith("/*")
      ? path.startsWith(pattern.replace("/*", ""))
      : path.startsWith(pattern)
  );
}

export async function middleware(req: NextRequest) {
  const cookieStore = await cookies(); 

  const role = cookieStore.get("fw_role")?.value ?? "guest";
  const email = cookieStore.get("fw_email")?.value ?? "unknown";
  const userId = cookieStore.get("fw_uid")?.value ?? "0";

  console.log("🔥 MIDDLEWARE");
  console.log("Role:", role);
  console.log("Email:", email);
  console.log("UserID:", userId);

  const path = req.nextUrl.pathname;

  if (isBlocked(role, path)) {
    const url = req.nextUrl.clone();
    url.pathname = "/not-authorized";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/billing/:path*",
    "/customers/:path*",
    "/contractors/:path*",
    "/drivers/:path*",
    "/vehicles/:path*",
    "/vehicle-types/:path*",
    "/general-settings",
    "/jobs/manage",
    "/jobs/audit-trail"
  ]
};
