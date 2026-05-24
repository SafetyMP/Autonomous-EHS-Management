"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { signInAsDemoAdmin } from "@/app/(auth)/sign-in/demo-actions";
import { authClient, enterpriseOidcProviderId } from "@/lib/auth-client";
import { safeAppRelativePath } from "@/lib/safe-app-path";

const demoUiEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const enterpriseSsoUiEnabled = process.env.NEXT_PUBLIC_ENTERPRISE_SSO === "1";

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const formErrorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  async function onDemoSignIn() {
    setError(null);
    setDemoLoading(true);
    const result = await signInAsDemoAdmin();
    setDemoLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const next = safeAppRelativePath(callbackUrl, "/dashboard");
    router.push(next);
    router.refresh();
  }

  async function onEnterpriseSso() {
    setError(null);
    setSsoLoading(true);
    const nextPath = safeAppRelativePath(callbackUrl, "/dashboard");
    const callbackURL = `${window.location.origin}${nextPath}`;
    const result = await authClient.signIn.oauth2({
      providerId: enterpriseOidcProviderId,
      callbackURL,
    });
    setSsoLoading(false);
    if (result.error) {
      const err = result.error as { message?: string };
      setError(err.message ?? "Unable to start single sign-on.");
      return;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      const err = result.error as { message?: string };
      setError(err.message ?? "Unable to sign in.");
      return;
    }
    const next = safeAppRelativePath(callbackUrl, "/dashboard");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in to EHS Console</h1>
      <p className="mt-1 text-sm text-zinc-700">
        <span className="font-medium text-zinc-900">Autonomous EHS</span> — ISO 45001 &amp; 14001
        management system. Use your organization credentials.{" "}
        <Link
          href="/sign-up"
          className="font-medium text-emerald-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          Create an account
        </Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formErrorId : undefined}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formErrorId : undefined}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        {error ? (
          <p id={formErrorId} className="text-base text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="min-h-11 w-full rounded-lg bg-emerald-800 px-4 py-3 text-base font-medium text-white hover:bg-emerald-900 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {enterpriseSsoUiEnabled ? (
        <div className="mt-6 border-t border-zinc-200 pt-6">
          <button
            type="button"
            disabled={ssoLoading || loading || demoLoading}
            aria-busy={ssoLoading}
            onClick={() => void onEnterpriseSso()}
            className="min-h-11 w-full rounded-lg border-2 border-zinc-800 bg-white px-4 py-3 text-base font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {ssoLoading ? "Redirecting to your organization…" : "Continue with company SSO"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-700">
            Requires OIDC environment variables on the server. See README (Enterprise SSO).
          </p>
        </div>
      ) : null}

      {demoUiEnabled ? (
        <section
          className="mt-10 border-t border-zinc-200 pt-8"
          aria-label="Demo access"
        >
          <p className="text-center text-sm text-zinc-700">
            Evaluating the sandbox? Use one-click demo access (local / staging only).
          </p>
          <button
            type="button"
            disabled={demoLoading || loading || ssoLoading}
            aria-busy={demoLoading}
            onClick={() => void onDemoSignIn()}
            className="mt-4 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {demoLoading ? "Opening demo session…" : "Try demo admin"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
