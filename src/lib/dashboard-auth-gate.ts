import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

/**
 * Server-validated session gate for /dashboard, /sign-in, /sign-up.
 * Used by Next.js `proxy` (Node runtime) so `auth.api.getSession` can hit the DB.
 */
export async function runDashboardAuthGate(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const user = session?.user;
  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
