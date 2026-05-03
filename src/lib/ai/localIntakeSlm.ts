import { env } from "@/lib/env";

/**
 * Optional boundary for on-device / tenant-VPC SLM on intake paths (proposal-only).
 *
 * **Product status:** No bundled local model is wired in this repository; the flag
 * reserves UX routing only. Authoritative persistence stays on the server after Zod +
 * RBAC — see CONTEXT.md “Local / edge SLM” and AGENTS.md AI rules.
 */
export function isLocalIntakeSlmEnabled(): boolean {
  return env.NEXT_PUBLIC_LOCAL_INTAKE_SLM === "1";
}
