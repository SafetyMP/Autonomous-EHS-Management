import { isIP } from "node:net";

const ALLOWED_WEBHOOK_HOST_SUFFIXES = [
  "hooks.slack.com",
  "slack.com",
  "webhook.office.com",
  "office.com",
  "office365.com",
  "outlook.com",
  "logic.azure.com",
  "azure.com",
  "discord.com",
  "discordapp.com",
];

/** Reject SSRF-prone webhook targets (localhost, metadata, private IP space). */
export function assertSafeOperationalWebhookUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid webhook URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Operational webhook URLs must use HTTPS.");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    throw new Error("Operational webhook URLs must not target localhost or internal hosts.");
  }
  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIPv4(host)) {
    throw new Error("Operational webhook URLs must not target private IP addresses.");
  }
  if (ipVersion === 6 && (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) {
    throw new Error("Operational webhook URLs must not target private IPv6 addresses.");
  }
  if (host === "169.254.169.254" || host.startsWith("metadata.")) {
    throw new Error("Operational webhook URLs must not target cloud metadata endpoints.");
  }
  const allowed = ALLOWED_WEBHOOK_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
  if (!allowed) {
    throw new Error("Operational webhook host is not on the approved notification allowlist.");
  }
}

function isPrivateIPv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  return false;
}
