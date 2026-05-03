import { describe, expect, it } from "vitest";
import { chunkText, escapeIlikePattern } from "@/lib/rag/chunkText";

describe("chunkText", () => {
  it("returns empty for blank input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("splits long text with overlap", () => {
    const text = "a".repeat(100);
    const chunks = chunkText(text, { maxChars: 40, overlap: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 40)).toBe(true);
  });
});

describe("escapeIlikePattern", () => {
  it("escapes ILIKE wildcards", () => {
    expect(escapeIlikePattern("100%_mix")).toBe("100\\%\\_mix");
  });
});
