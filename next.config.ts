import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/** Merge `.env*` into `process.env` before Next forks workers (avoids missing vars during collect). Safe here only — not in `src/lib/env.ts` (client-imported). */
loadEnvConfig(process.cwd());

const isDev = process.env.NODE_ENV !== "production";

/**
 * Baseline CSP (July 2026 hardening plan):
 * - Keep `'unsafe-inline'` / `'unsafe-eval'` on script-src until Next App Router supports
 *   nonce/hash CSP without breaking hydration (track Next CSP nonce docs + Turbopack).
 * - Production adds `upgrade-insecure-requests`.
 * - Next step: middleware/proxy nonce injection + `strict-dynamic` once build pipeline can
 *   stamp nonces on framework scripts without breaking standalone Docker/Vercel deploys.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Temporary: Next.js inline bootstrapping still requires these in many App Router builds.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  isDev
    ? "connect-src 'self' http: https: ws: wss:"
    : "connect-src 'self'",
  ...(!isDev ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera=(self) enables capture on intake routes; geolocation/mic stay disabled unless product enables them.
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Emits `.next/standalone` for the root Dockerfile (Kubernetes/ECS, etc.). Vercel builds ignore this for routing; see Next "output" docs.
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
