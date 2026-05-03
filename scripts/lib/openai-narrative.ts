/**
 * Optional OpenAI-compatible narrative rewrite for demo seeds (no server-only).
 */
export async function maybeEnrichParagraph(paragraph: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return paragraph;

  const baseUrl = (
    process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.AI_FALLBACK_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 280,
        messages: [
          {
            role: "system",
            content:
              "You write concise, professional EHS incident narratives for a manufacturing demo. Output plain prose only, no headings, no PII; invent realistic job titles not personal names.",
          },
          {
            role: "user",
            content: `Rewrite and slightly vary this paragraph for a demo database (keep facts and severity level). Max 4 sentences.\n\n${paragraph}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 40 ? text : paragraph;
  } catch {
    return paragraph;
  }
}
