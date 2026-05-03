import { describe, expect, it } from "vitest";
import { safeAppRelativePath } from "@/lib/safe-app-path";

describe("safeAppRelativePath", () => {
  it("rejects protocol-relative URLs", () => {
    expect(safeAppRelativePath("//evil.example/phish", "/dashboard")).toBe("/dashboard");
  });

  it("rejects non-path inputs", () => {
    expect(safeAppRelativePath("https://evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeAppRelativePath("javascript:alert(1)", "/dashboard")).toBe("/dashboard");
  });

  it("allows simple internal paths", () => {
    expect(safeAppRelativePath("/dashboard", "/")).toBe("/dashboard");
    expect(safeAppRelativePath("/dashboard?tab=1", "/")).toBe("/dashboard?tab=1");
    expect(safeAppRelativePath("/path#frag", "/")).toBe("/path#frag");
    expect(safeAppRelativePath("/a%20b/c", "/")).toBe("/a%20b/c");
  });

  it("rejects leading whitespace and odd prefixes", () => {
    expect(safeAppRelativePath("\t/dashboard", "/safe")).toBe("/safe");
    expect(safeAppRelativePath("\u00A0/dashboard", "/safe")).toBe("/safe");
    expect(safeAppRelativePath("relative-only", "/safe")).toBe("/safe");
  });

  it("normalizes NUL in path segments without widening host", () => {
    expect(safeAppRelativePath("/dash\u0000evil", "/safe")).toBe("/dash%00evil");
  });

  it("rejects URLs that normalize to unexpected authority/host", () => {
    expect(safeAppRelativePath(`/${String.fromCharCode(92)}evil`, "/safe")).toBe("/safe");
  });

  it("caps stress: very long ASCII path stays same-origin relative shape", () => {
    const long = "/" + "p".repeat(8000);
    expect(safeAppRelativePath(long, "/safe")).toBe(long);
  });
});
