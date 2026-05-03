import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getAiGateway } from "@/lib/ai/gateway";
import { redactForPrompt } from "@/lib/pii/redact";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { searchRagChunks } from "@/server/services/ragSearch";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, router } from "../init";

const assistantStepSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("rag_search"),
    query: z.string().min(2).max(512),
  }),
  z.object({
    step: z.literal("final"),
    summary: z.string().min(10).max(8000),
    citedChunkIds: z.array(z.string().uuid()).max(30).optional(),
  }),
]);

function tryParseAssistantStep(raw: string): z.infer<typeof assistantStepSchema> | null {
  try {
    const data: unknown = JSON.parse(raw);
    const parsed = assistantStepSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const aiAssistantRouter = router({
  /**
   * Bounded tool loop: model may issue `rag_search` steps, then must return `final`.
   * Mutations to regulated entities are not performed — output is a proposal only.
   */
  proposeWithRagContext: protectedMutation
    .input(
      orgScope.extend({
        goal: z.string().min(10).max(4000),
        maxToolCalls: z.number().int().min(1).max(5).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RAG_READ);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.AI_DRAFT_USE);

      const gateway = getAiGateway();
      const maxCalls = input.maxToolCalls ?? 4;
      const safeGoal = redactForPrompt(input.goal);
      let transcript = `Goal: ${safeGoal}\n`;
      const toolResults: string[] = [];

      const model =
        process.env.AI_ASSISTANT_MODEL ??
        process.env.AI_DRAFT_MODEL ??
        "gpt-4o-mini";

      for (let round = 0; round < maxCalls; round++) {
        const raw = await gateway.completeJson({
          model,
          system: [
            "You assist EHS users using the organization's RAG knowledge base.",
            "Reply with JSON only, one object:",
            '{"step":"rag_search","query":"<short keyword query>"} to retrieve passages, or',
            '{"step":"final","summary":"<clear answer>","citedChunkIds":["uuid",...]} when done.',
            "Call rag_search first if you lack evidence. citedChunkIds must come from prior tool output chunkId= lines.",
          ].join(" "),
          user: `${transcript}\nPrior tool results:\n${toolResults.join("\n---\n") || "(none)"}\nNext JSON step:`,
          maxOutputTokens: 1024,
        });

        let step = tryParseAssistantStep(raw);
        if (!step) {
          const repaired = await gateway.completeJson({
            model,
            system:
              'Return ONLY valid JSON. Shape must be exactly one of: {"step":"rag_search","query":"..."} or {"step":"final","summary":"...","citedChunkIds":["uuid"]}. citedChunkIds optional. No markdown fences or prose.',
            user: raw,
            maxOutputTokens: 512,
          });
          step = tryParseAssistantStep(repaired);
        }
        if (!step) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assistant returned an invalid JSON step.",
          });
        }

        if (step.step === "final") {
          const citedChunkIds = step.citedChunkIds ?? [];
          await writeAuditLog(ctx.db, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "ai.assistant.propose",
            entityType: "ai_assistant_session",
            entityId: randomUUID(),
            payload: {
              goalRedacted: safeGoal.slice(0, 500),
              citedChunkIds,
              toolRounds: round + 1,
              model,
            },
          });

          return {
            summary: step.summary,
            citedChunkIds,
            toolRounds: round + 1,
          };
        }

        const hits = await searchRagChunks(ctx.db, {
          organizationId: input.organizationId,
          query: step.query,
          limit: 12,
        });

        const hitSummary = hits
          .map(
            (h) =>
              `chunkId=${h.chunkId} title=${h.sourceTitle} excerpt=${redactForPrompt(h.excerpt.slice(0, 500))}`,
          )
          .join("\n");

        toolResults.push(`rag_search query=${step.query}\n${hitSummary}`);
        transcript += `Round ${round + 1}: rag_search(${step.query}) → ${hits.length} hits.\n`;
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Assistant did not produce a final answer within the tool budget.",
      });
    }),
});
