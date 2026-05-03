import "server-only";

import type { AiGateway } from "@/lib/ai/gateway";
import { env } from "@/lib/env";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type EmbeddingsResponse = {
  data?: Array<{ embedding?: number[]; index?: number }>;
  error?: { message?: string };
};

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function openAiFetchJson<T>(
  url: string,
  init: RequestInit,
  options?: { maxAttempts?: number; timeoutMs?: number },
): Promise<{ ok: boolean; status: number; body: T }> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const timeoutMs = options?.timeoutMs ?? 45_000;
  let lastStatus = 500;
  let lastBody = {} as T;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
    lastStatus = res.status;
    lastBody = (await res.json()) as T;
    if (res.ok || !RETRYABLE_STATUS.has(res.status)) {
      return { ok: res.ok, status: res.status, body: lastBody };
    }
    await sleep(2 ** attempt * 250 + Math.random() * 100);
  }

  return { ok: false, status: lastStatus, body: lastBody };
}

/**
 * OpenAI-compatible Chat Completions API (`/v1/chat/completions`).
 * Works with OpenAI and many gateways that mirror the same JSON shape.
 */
export function createOpenAiCompatibleGateway(options: {
  apiKey: string;
  baseUrl?: string;
}): AiGateway {
  const base = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const fallbackModel = env.AI_FALLBACK_MODEL;
  const embeddingModel = env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small";

  return {
    async completeJson({ model, system, user, maxOutputTokens }) {
      const payload = {
        model,
        messages: [
          { role: "system" as const, content: system },
          { role: "user" as const, content: user },
        ],
        max_tokens: maxOutputTokens ?? 1024,
        response_format: { type: "json_object" as const },
      };

      const run = async (m: string) =>
        openAiFetchJson<ChatCompletionResponse>(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, model: m }),
        });

      let result = await run(model);
      if (
        !result.ok &&
        fallbackModel &&
        fallbackModel !== model &&
        (result.status === 429 || result.status >= 500)
      ) {
        result = await run(fallbackModel);
      }

      const { ok, body: data } = result;

      if (!ok) {
        throw new Error(data.error?.message ?? `OpenAI-compatible API error`);
      }
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error("Empty completion from model.");
      }
      return text;
    },

    async embedTexts({ texts, model }) {
      const m = model ?? embeddingModel;
      const { ok, body: data } = await openAiFetchJson<EmbeddingsResponse>(
        `${base}/embeddings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: m, input: texts }),
        },
      );

      if (!ok) {
        throw new Error(data.error?.message ?? `OpenAI-compatible embeddings error`);
      }

      const rows = [...(data.data ?? [])].sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      );
      return rows.map((r) => {
        const emb = r.embedding;
        if (!emb?.length) {
          throw new Error("Missing embedding vector in API response.");
        }
        return emb;
      });
    },
  };
}
