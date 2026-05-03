function trustForwardedHeaders(): boolean {
  return process.env.TRUST_PROXY === "1";
}

export function getClientIpFromHeaders(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;

  if (trustForwardedHeaders()) {
    const forwarded = headers.get("x-forwarded-for");
    const fromForwarded = forwarded?.split(",")[0]?.trim();
    if (fromForwarded) return fromForwarded;
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  return "unknown";
}
