import { describe, expect, it } from "vitest";
import { nextOutputMode } from "@/lib/nextOutputMode";

describe("nextOutputMode", () => {
  it("emits standalone for Docker/K8s (VERCEL unset)", () => {
    expect(nextOutputMode({})).toBe("standalone");
  });

  it("skips standalone on Vercel so next-server.js.nft.json is emitted", () => {
    expect(nextOutputMode({ VERCEL: "1" })).toBeUndefined();
  });
});
