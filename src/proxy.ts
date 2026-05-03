import type { NextRequest } from "next/server";
import { runDashboardAuthGate } from "@/lib/dashboard-auth-gate";

export async function proxy(request: NextRequest) {
  return runDashboardAuthGate(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
