import { describe, expect, it } from "vitest";
import { buildCtxUri, parseCtxUri } from "@/server/services/contextSync/parseCtxUri";
import { ctxUriGlobMatch } from "@/server/services/contextSync/glob";
import { computeLineDiff } from "@/server/services/contextSync/lineDiff";
import { parseImsLinkedUri } from "@/server/services/contextSync/imsLinkedUri";

const org = "aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee";

describe("parseCtxUri", () => {
  it("parses valid URIs with multi-segment artifact path", () => {
    const u = `ctx://${org}/compliance/policies/retention`;
    const p = parseCtxUri(u);
    expect(p).toMatchObject({
      uri: u,
      orgId: org,
      domain: "compliance",
      artifactPath: "policies/retention",
    });
  });

  it("returns null on invalid URIs", () => {
    expect(parseCtxUri("https://bad")).toBeNull();
    expect(parseCtxUri(`ctx://${org}//x`)).toBeNull(); // invalid domain empties
    expect(parseCtxUri(`ctx://not-uuid/domain/x`)).toBeNull();
  });

  it("buildCtxUri trims slashes", () => {
    expect(buildCtxUri(org, "hr", "//foo/bar//")).toBe(`ctx://${org}/hr/foo/bar`);
  });
});

describe("ctxUriGlobMatch", () => {
  it("matches single-segment wildcard", () => {
    const uri = `ctx://${org}/compliance/retention-policy`;
    expect(ctxUriGlobMatch(`ctx://${org}/compliance/*`, uri)).toBe(true);
    expect(ctxUriGlobMatch(`ctx://${org}/hr/*`, uri)).toBe(false);
  });

  it("matches double-star suffix", () => {
    const uri = `ctx://${org}/compliance/foo/bar`;
    expect(ctxUriGlobMatch(`ctx://${org}/**`, uri)).toBe(true);
    expect(ctxUriGlobMatch(`ctx://${org}/compliance/**`, uri)).toBe(true);
    expect(ctxUriGlobMatch(`ctx://${org}/compliance/other/**`, uri)).toBe(false);
  });

  it("bare * matches everything", () => {
    expect(ctxUriGlobMatch("*", `ctx://${org}/a/b`)).toBe(true);
  });
});

describe("computeLineDiff", () => {
  it("counts added and removed lines", () => {
    const d = computeLineDiff("a\nb", "a\nc");
    expect(d.stats).toEqual({
      addedLines: 1,
      removedLines: 1,
      unchangedLines: 1,
    });
  });
});

describe("parseImsLinkedUri", () => {
  const revision = "aaaaaaaa-bbbb-4ccc-a111-aaaaaaaaaaaa";
  const u = parseCtxUri(`ctx://${org}/ims/policy-revision/${revision}`)!;

  it("parses ims policy_revision links", () => {
    expect(parseImsLinkedUri(u)).toEqual({
      kind: "policy_revision",
      id: revision,
    });
  });

  it("returns null outside ims domain", () => {
    const other = parseCtxUri(`ctx://${org}/vault/doc/x`)!;
    expect(parseImsLinkedUri(other)).toBeNull();
  });
});
