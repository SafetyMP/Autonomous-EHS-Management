import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, safeExternalHttpHref } from "@/lib/safe-http-url";

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("https://example.com/doc")).toBe(true);
    expect(isSafeHttpUrl("http://example.com/doc")).toBe(true);
  });

  it("rejects javascript and other schemes", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpUrl("demo://local/rag/x")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});

describe("safeExternalHttpHref", () => {
  it("returns normalized href or null", () => {
    expect(safeExternalHttpHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeExternalHttpHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHttpHref(null)).toBeNull();
    expect(safeExternalHttpHref(undefined)).toBeNull();
  });
});
