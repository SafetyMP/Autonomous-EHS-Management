import { z } from "zod";

/**
 * Use the same schemas as (or stricter than) API inputs when validating LLM JSON.
 * Fails fast before any DB write.
 */
export function parseModelJson<T>(schema: z.ZodType<T>, raw: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Model output is not valid JSON.");
  }
  return schema.parse(parsed);
}
