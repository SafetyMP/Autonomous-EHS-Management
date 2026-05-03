import { describe, expect, it } from "vitest";
import {
  tryParseAssistantStep,
  tryParseCapaIntakeDraft,
  tryParseIncidentIntakeDraft,
  tryParseInspectionIntakeDraft,
  tryParseObservationIntakeDraft,
  tryParsePermitIntakeDraft,
} from "@/lib/ai/assistantStructuredParse";

describe("tryParseAssistantStep", () => {
  it("parses valid rag_search step", () => {
    expect(tryParseAssistantStep('{"step":"rag_search","query":"ppe audit"}')).toEqual({
      step: "rag_search",
      query: "ppe audit",
    });
  });

  it("parses valid final step with optional citedChunkIds", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(
      tryParseAssistantStep(
        JSON.stringify({
          step: "final",
          summary: "Use guardrails per SOP-12.",
          citedChunkIds: [id],
        }),
      ),
    ).toEqual({
      step: "final",
      summary: "Use guardrails per SOP-12.",
      citedChunkIds: [id],
    });
  });

  it("returns null for JSON wrapped in markdown fences", () => {
    expect(
      tryParseAssistantStep(
        '```json\n{"step":"rag_search","query":"ok"}\n```',
      ),
    ).toBeNull();
  });

  it("returns null for non-JSON prose", () => {
    expect(tryParseAssistantStep("Here is the answer: use gloves.")).toBeNull();
  });

  it("returns null for unknown step discriminator", () => {
    expect(
      tryParseAssistantStep(
        '{"step":"tool_call","name":"search"}',
      ),
    ).toBeNull();
  });

  it("returns null when rag_search query is too short", () => {
    expect(tryParseAssistantStep('{"step":"rag_search","query":"x"}')).toBeNull();
  });

  it("returns null when final summary is too short", () => {
    expect(
      tryParseAssistantStep('{"step":"final","summary":"short"}'),
    ).toBeNull();
  });

  it("returns null when citedChunkIds contains invalid UUID strings", () => {
    expect(
      tryParseAssistantStep(
        '{"step":"final","summary":"Ten chars ok","citedChunkIds":["not-a-uuid"]}',
      ),
    ).toBeNull();
  });
});

describe("tryParseObservationIntakeDraft", () => {
  it("accepts valid draft JSON", () => {
    const r = tryParseObservationIntakeDraft(
      '{"suggestedSummary":"Oil near ignition","suggestedDetails":"Small leak"}',
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.suggestedSummary).toBe("Oil near ignition");
    }
  });

  it("fails on fenced JSON (invalid JSON text)", () => {
    const r = tryParseObservationIntakeDraft('```\n{"suggestedSummary":"x"}\n```');
    expect(r.success).toBe(false);
  });

  it("fails when suggestedSummary is too short after JSON parse", () => {
    const r = tryParseObservationIntakeDraft('{"suggestedSummary":"x"}');
    expect(r.success).toBe(false);
  });
});

describe("tryParseIncidentIntakeDraft", () => {
  it("accepts valid draft JSON with optional fields", () => {
    const r = tryParseIncidentIntakeDraft(
      JSON.stringify({
        suggestedTitle: "Sprain unloading dock",
        suggestedDescription: "Worker twisted ankle on wet surface near bay 2.",
        suggestedImmediateActions: "Marked area, notified supervisor.",
        suggestedSeverity: "medium",
        suggestedIncidentType: "injury",
      }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.suggestedTitle).toContain("Sprain");
      expect(r.data.suggestedSeverity).toBe("medium");
    }
  });

  it("rejects invalid incident type", () => {
    const r = tryParseIncidentIntakeDraft(
      '{"suggestedTitle":"ok title here","suggestedDescription":"enough text here for min length","suggestedIncidentType":"banana"}',
    );
    expect(r.success).toBe(false);
  });
});

describe("tryParseInspectionIntakeDraft", () => {
  it("accepts valid draft JSON", () => {
    const r = tryParseInspectionIntakeDraft(
      '{"suggestedTitle":"Monthly warehouse walkthrough","suggestedInspectionType":"routine"}',
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.suggestedTitle).toContain("warehouse");
      expect(r.data.suggestedInspectionType).toBe("routine");
    }
  });
});

describe("tryParsePermitIntakeDraft", () => {
  it("accepts valid draft JSON", () => {
    const r = tryParsePermitIntakeDraft(
      '{"suggestedTitle":"Hot work roof HVAC","suggestedWorkSummary":"Welding patches on supports at plant roof.","suggestedPermitType":"hot_work"}',
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.suggestedPermitType).toBe("hot_work");
    }
  });
});

describe("tryParseCapaIntakeDraft", () => {
  it("accepts valid draft JSON", () => {
    const r = tryParseCapaIntakeDraft(
      '{"suggestedTitle":"Guard missing on lathe","suggestedDetails":"Install interlocked guard per OEM drawing; verify during next Gemba."}',
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.suggestedDetails.length).toBeGreaterThanOrEqual(20);
    }
  });

  it("rejects short details", () => {
    const r = tryParseCapaIntakeDraft('{"suggestedTitle":"ok","suggestedDetails":"too short"}');
    expect(r.success).toBe(false);
  });
});
