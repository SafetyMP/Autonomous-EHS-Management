import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getAiGateway, registerAiGateway } from "@/lib/ai/gateway";

/**
 * Golden JSON-shape checks for LLM outputs (no live API calls).
 * Pair production routes with the same Zod schemas before persisting.
 */
const IncidentTriageSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().min(1),
  suggestedActions: z.array(z.string()).optional(),
});

describe("eval: incident triage JSON", () => {
  it("parses a well-formed model payload", () => {
    const raw = `{"severity":"high","summary":"Spill reported in bay 2","suggestedActions":["Contain","Notify supervisor"]}`;
    const parsed = IncidentTriageSchema.parse(JSON.parse(raw));
    expect(parsed.severity).toBe("high");
  });

  it("rejects invalid severity", () => {
    const raw = `{"severity":"extreme","summary":"x"}`;
    expect(() => IncidentTriageSchema.parse(JSON.parse(raw))).toThrow();
  });
});

describe("eval: gateway returns JSON text", () => {
  it("completeJson output parses with schema", async () => {
    registerAiGateway({
      async completeJson() {
        return JSON.stringify({
          severity: "medium",
          summary: "Near miss — forklift zone",
        });
      },
      async embedTexts() {
        return [];
      },
    });

    const text = await getAiGateway().completeJson({
      model: "mock",
      system: "Return JSON only.",
      user: "Triage this.",
    });
    const parsed = IncidentTriageSchema.parse(JSON.parse(text));
    expect(parsed.severity).toBe("medium");
  });
});
