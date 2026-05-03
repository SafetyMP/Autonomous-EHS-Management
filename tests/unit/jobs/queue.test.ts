import { describe, expect, it } from "vitest";
import { getJobQueue } from "@/server/jobs/queue";
import { JOB_NAMES } from "@/server/jobs/types";

describe("getJobQueue", () => {
  it("enqueue resolves without throwing (noop path)", async () => {
    const q = getJobQueue();
    await expect(
      q.enqueue(JOB_NAMES.DATA_RETENTION_RUN_CHUNK, { batchSize: 10 }),
    ).resolves.toBeUndefined();
  });
});
