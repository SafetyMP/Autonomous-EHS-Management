/**
 * Docker/K8s copy `.next/standalone`. Vercel injects `VERCEL=1` and runs an
 * adapter `onBuildComplete` that opens `.next/next-server.js.nft.json`.
 * Standalone + that adapter currently omits the file (ENOENT; Next.js #96646).
 */
export function nextOutputMode(env: {
  readonly [key: string]: string | undefined;
}): "standalone" | undefined {
  return env.VERCEL ? undefined : "standalone";
}
