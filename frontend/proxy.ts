import { type NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const token =
    req.cookies.get("refresh_token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  const { pathname } = req.nextUrl;

  const publicPaths = ["/", "/login", "/register"];
  const isPublicPath = publicPaths.includes(pathname);

  // // unauthenticated user
  // if (!token && !isPublicPath) {
  //   return NextResponse.redirect(new URL("/login", req.url));
  // }

  // // authenticated user
  // if (token && isPublicPath) {
  //   return NextResponse.redirect(new URL("/dashboard", req.url));
  // }

  return NextResponse.next();
}

// This ensures middleware config only applies to appropriate routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
