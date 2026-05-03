import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "@/lib/rag/cosineSimilarity";

describe("cosineSimilarity", () => {
  it("returns 0 when lengths mismatch or either side is empty", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 1])).toBe(0);
    expect(cosineSimilarity([1, 1], [])).toBe(0);
  });

  it("returns 0 when both vectors have zero magnitude", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("returns 1 for parallel positive vectors after L2 normalization", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 5);
    expect(cosineSimilarity([3], [9])).toBeCloseTo(1, 5);
  });

  it("returns ~0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("handles negative components", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it("pins behavior for degenerate denominators via first vector only", () => {
    expect(cosineSimilarity([0, 1], [0, 0])).toBe(0);
  });

  it("documents NaN propagation when coordinates are non-finite", () => {
    expect(Number.isNaN(cosineSimilarity([NaN, 1], [1, 0]))).toBe(true);
    expect(Number.isNaN(cosineSimilarity([1, 2], [Infinity, 0]))).toBe(true);
  });

  it("does not mutate inputs", () => {
    const a = [3, 4];
    const b = [30, 40];
    const ac = [...a];
    const bc = [...b];
    cosineSimilarity(a, b);
    expect(a).toEqual(ac);
    expect(b).toEqual(bc);
  });
});
