import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { roleAccessRules } from "@/config/roleAccess";

function isBlocked(role: string, path: string): boolean {
  const rules = roleAccessRules[role] || roleAccessRules["guest"];
  return rules.some((pattern) =>
    pattern.endsWith("/*")
      ? path.startsWith(pattern.replace("/*", ""))
      : path.startsWith(pattern)
  );
}

export async function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get("session");
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let role = "guest";
  try {
    const backendUrl = process.env.AUTH_BACKEND_URL || req.nextUrl.origin;
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      credentials: "include", // ensures HttpOnly cookie is sent
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") ?? "", // forward cookies to backend
      },
    });

    if (res.ok) {
      const data = await res.json();
      const userData = data.response?.user || data.user || data || null;
      const roles = userData?.roles || [];

      if (Array.isArray(roles) && roles.length > 0) {
        const primaryRole =
          typeof roles[0] === "string"
            ? roles[0]
            : roles[0]?.name || roles[0]?.role || "guest";
        role = primaryRole.toLowerCase();
      }
    } else if (res.status === 401) {
      // Unauthenticated or expired session
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } catch (err: any) {

  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    console.error("[AUTH_MIDDLEWARE_ERROR]", {
      message: err?.message,
      name: err?.name,
    });
  }

  if (isProd) {
    console.warn("[AUTH_MIDDLEWARE_ERROR]");
  }

  role = "guest";
}
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
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg)|login|register|public).*)",
  ],
};


// export const config = {
//   matcher: [
//     "/billing/:path*",
//     "/customers/:path*",
//     "/contractors/:path*",
//     "/drivers/:path*",
//     "/vehicles/:path*",
//     "/vehicle-types/:path*",
//     "/general-settings",
//     "/jobs/:path*",
//     "/services-vehicle-price/:path*",
//   ],
// };
