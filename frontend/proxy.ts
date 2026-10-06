import { NextResponse, type NextRequest } from "next/server";

const GUEST_ONLY = ["/", "/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has("refresh_token");
  const isDocs = pathname === "/docs" || pathname.startsWith("/docs/");

  if (signedIn && GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (!signedIn && !isDocs && !GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};
