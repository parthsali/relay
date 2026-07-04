import { type NextRequest, NextResponse } from "next/server";

// Routes that do NOT require authentication
const PUBLIC = ["/login", "/auth/callback"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("relay_token")?.value;

  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  // Not logged in → go to login (except for public routes)
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already logged in → skip login page, go to dashboard
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon).*)"],
};
