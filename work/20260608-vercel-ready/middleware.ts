import { NextResponse, type NextRequest } from "next/server";
import { can, demoSession } from "@/lib/rbac";

const protectedRoutes: Array<{ prefix: string; permission: string }> = [
  { prefix: "/sector-analytics", permission: "sector:view" },
  { prefix: "/content-review", permission: "content:review" }
];

export function middleware(request: NextRequest) {
  const route = protectedRoutes.find((item) => request.nextUrl.pathname.startsWith(item.prefix));
  if (!route) return NextResponse.next();

  if (!can(demoSession.user.role, route.permission)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("denied", route.permission);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sector-analytics/:path*", "/content-review/:path*"]
};
