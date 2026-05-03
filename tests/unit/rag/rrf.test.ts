import { describe, expect, it } from "vitest";
import { mergeLexicalVectorRrf } from "@/server/services/ragSearch";

describe("mergeLexicalVectorRrf", () => {
  it("ranks chunks present in both lists higher than single-list-only when RRF prefers overlap", () => {
    const a = {
      chunkId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      chunkIndex: 0,
      excerpt: "a",
      sourceId: "11111111-1111-1111-1111-111111111111",
      sourceTitle: "S1",
      sourceUri: null,
      programTag: null,
      topicTags: [] as string[],
      distance: 0.1,
    };
    const b = {
      chunkId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      chunkIndex: 0,
      excerpt: "b",
      sourceId: "22222222-2222-2222-2222-222222222222",
      sourceTitle: "S2",
      sourceUri: null,
      programTag: null,
      topicTags: [] as string[],
      distance: 0.05,
    };

    const vectorRows = [b, a];
    const lexicalRows = [
      {
        chunkId: a.chunkId,
        chunkIndex: a.chunkIndex,
        excerpt: a.excerpt,
        sourceId: a.sourceId,
        sourceTitle: a.sourceTitle,
        sourceUri: a.sourceUri,
        programTag: a.programTag,
        topicTags: a.topicTags,
      },
    ];

    const merged = mergeLexicalVectorRrf({
      vectorRows,
      lexicalRows,
      limit: 2,
      rrfK: 60,
    });

    expect(merged).toHaveLength(2);
    expect(merged[0]!.chunkId).toBe(a.chunkId);
  });

  it("returns up to limit hits", () => {
    const row = (id: string, dist: number) => ({
      chunkId: id,
      chunkIndex: 0,
      excerpt: "x",
      sourceId: "11111111-1111-1111-1111-111111111111",
      sourceTitle: "S",
      sourceUri: null,
      programTag: null,
      topicTags: [] as string[],
      distance: dist,
    });
    const ids = [
      "10000000-0000-0000-0000-000000000001",
      "10000000-0000-0000-0000-000000000002",
      "10000000-0000-0000-0000-000000000003",
    ];
    const merged = mergeLexicalVectorRrf({
      vectorRows: ids.map((id, i) => row(id, 0.01 * (i + 1))),
      lexicalRows: [],
      limit: 2,
    });
    expect(merged).toHaveLength(2);
  });
});
