import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo/mode";

const GUEST_ONLY = ["/", "/login", "/register"];
const OPEN = ["/demo", "/docs"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has("refresh_token");
  const inDemo = req.cookies.get(DEMO_COOKIE)?.value === "1";
  const isOpen = OPEN.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (signedIn && GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (!signedIn && !inDemo && !isOpen && !GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};
