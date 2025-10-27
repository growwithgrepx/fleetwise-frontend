import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { roleAccessRules } from "@/config/roleAccess";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join("; ");

    const backendUrl =
      process.env.AUTH_BACKEND_URL || new URL(req.url).origin;

    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader
      },
      cache: "no-store"
    });

    if (!res.ok) throw new Error("Unauthorized");

    const data = await res.json();
    const userData = data.response?.user || data.user || data;

    const roles = userData?.roles || [];
    const firstRole = roles[0];

    const role =
      (typeof firstRole === "string"
        ? firstRole
        : firstRole?.name || firstRole?.role)?.toLowerCase() || "guest";

    return NextResponse.json({
      role,
      allowedNav: roleAccessRules[role] || []
    });
  } catch {
    return NextResponse.json({
      role: "guest",
      allowedNav: roleAccessRules["guest"] || []
    });
  }
}
