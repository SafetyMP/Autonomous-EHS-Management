"use server";

import { APIError } from "@better-auth/core/error";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { env } from "@/lib/env";

export async function signInAsDemoAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (
    process.env.NODE_ENV === "production" &&
    env.DEMO_ALLOW_PRODUCTION !== "true"
  ) {
    return { ok: false, error: "Demo sign-in is disabled in production." };
  }

  if (env.DEMO_MODE !== "true") {
    return { ok: false, error: "Demo sign-in is not enabled." };
  }

  const email = env.DEMO_ADMIN_EMAIL;
  const password = env.DEMO_ADMIN_PASSWORD;
  if (!email?.length || !password?.length) {
    return { ok: false, error: "Demo credentials are not configured." };
  }

  const incoming = await headers();
  const h = new Headers(incoming);
  if (!h.get("origin")) {
    h.set("origin", env.NEXT_PUBLIC_APP_URL);
  }

  try {
    await auth.api.signInEmail({
      body: { email, password, rememberMe: true },
      headers: h,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof APIError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof Error) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Unable to sign in as demo admin." };
  }
}
