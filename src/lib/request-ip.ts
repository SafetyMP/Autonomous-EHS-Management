function trustForwardedHeaders(): boolean {
  return process.env.TRUST_PROXY === "1";
}

/** Vercel injects this; only trust the header on Vercel-managed runtimes. */
function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function getClientIpFromHeaders(headers: Headers): string {
  if (isVercelRuntime()) {
    const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (vercel) return vercel;
  }

  if (trustForwardedHeaders()) {
    const forwarded = headers.get("x-forwarded-for");
    const fromForwarded = forwarded?.split(",")[0]?.trim();
    if (fromForwarded) return fromForwarded;
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  return "unknown";
}
