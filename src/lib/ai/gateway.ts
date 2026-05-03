import "server-only";

/**
 * Single place for LLM / embedding provider calls when you add AI features.
 *
 * - Route all vendors through here; read API keys from env only inside this module.
 * - Add retries, timeouts, and structured logging (redact PII where required).
 * - Pair with Zod: `schema.parse(JSON.parse(modelOutput))` before persisting.
 * - Heavy routes should use Upstash rate limits (`@/server/ratelimit`).
 *
 * Implementations may use Vercel AI SDK, OpenAI SDK, etc. This stub keeps imports out
 * of the rest of the app until you enable the feature.
 */
export type AiGateway = {
  /** Example: completion with JSON-shaped output validated by caller */
  completeJson(args: {
    model: string;
    system: string;
    user: string;
    maxOutputTokens?: number;
  }): Promise<string>;
  /** OpenAI-compatible `/v1/embeddings` when using createOpenAiCompatibleGateway */
  embedTexts(args: { texts: string[]; model?: string }): Promise<number[][]>;
};

let singleton: AiGateway | null = null;

export function registerAiGateway(implementation: AiGateway) {
  singleton = implementation;
}

/**
 * Returns the registered gateway or throws. Call from server-only routes / tRPC.
 */
export function getAiGateway(): AiGateway {
  if (!singleton) {
    throw new Error(
      "AI gateway is not registered. Call registerAiGateway() at startup or add a provider module.",
    );
  }
  return singleton;
}
