import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Add security headers
  const headers = new Headers(request.headers);
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return NextResponse.next({
    headers,
  });
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};

