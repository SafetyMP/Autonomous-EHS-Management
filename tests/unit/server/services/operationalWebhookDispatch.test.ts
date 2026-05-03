import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyOperationalWebhookSignature } from "@/server/services/operationalWebhookDispatch";

function signatureHeader(secret: string, rawBodyUtf8: string): string {
  const hmac = createHmac("sha256", secret).update(rawBodyUtf8, "utf8").digest("hex");
  return `sha256=${hmac}`;
}

describe("verifyOperationalWebhookSignature", () => {
  it("accepts matching HMAC hex", () => {
    const raw = JSON.stringify({ a: 1 });
    expect(verifyOperationalWebhookSignature("s3cr3t-s3cr3t-s3cr3t", raw, signatureHeader("s3cr3t-s3cr3t-s3cr3t", raw))).toBe(
      true,
    );
  });

  it("rejects mismatched secret", () => {
    const raw = JSON.stringify({ a: 1 });
    expect(verifyOperationalWebhookSignature("wrong", raw, signatureHeader("s3cr3t-s3cr3t-s3cr3t", raw))).toBe(false);
  });
});
