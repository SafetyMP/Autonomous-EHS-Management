import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getAiGateway } from "@/lib/ai/gateway";
import {
  tryParseAssistantStep,
  tryParseCapaIntakeDraft,
  tryParseIncidentIntakeDraft,
  tryParseInspectionIntakeDraft,
  tryParseObservationIntakeDraft,
  tryParsePermitIntakeDraft,
} from "@/lib/ai/assistantStructuredParse";
import {
  ASSISTANT_TOOL_STEP_JSON_REPAIR_SYSTEM,
  CAPA_INTAKE_JSON_REPAIR_SYSTEM,
  INCIDENT_INTAKE_JSON_REPAIR_SYSTEM,
  INSPECTION_INTAKE_JSON_REPAIR_SYSTEM,
  OBSERVATION_INTAKE_JSON_REPAIR_SYSTEM,
  PERMIT_INTAKE_JSON_REPAIR_SYSTEM,
} from "@/lib/ai/structuredJsonRepairPrompts";
import { logWarn } from "@/lib/logger";
import { redactForPrompt } from "@/lib/pii/redact";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { writeAuditLog } from "@/server/services/audit";
import {
  type AssistantLogContext,
  gatewayCompleteJson,
  runRagBackedIntakeDraft,
} from "@/server/services/ai/ragIntakeDraftPipeline";
import { searchRagChunks } from "@/server/services/ragSearch";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, router } from "../init";

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

      const logCtx: AssistantLogContext = {
        procedure: "aiAssistant.proposeWithRagContext",
        organizationId: input.organizationId,
      };

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
        const raw = await gatewayCompleteJson(
          gateway,
          {
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
          },
          logCtx,
        );

        let step = tryParseAssistantStep(raw);
        if (!step) {
          logWarn("ai_assistant_step_parse_retry", {
            ...logCtx,
            round: round + 1,
            jsonRepairAttempt: true,
            rawHead: raw.slice(0, 140),
          });
          const repaired = await gatewayCompleteJson(
            gateway,
            {
              model,
              system: ASSISTANT_TOOL_STEP_JSON_REPAIR_SYSTEM,
              user: raw,
              maxOutputTokens: 512,
            },
            logCtx,
          );
          step = tryParseAssistantStep(repaired);
        }
        if (!step) {
          logWarn("ai_assistant_step_parse_failed", {
            ...logCtx,
            round: round + 1,
            jsonRepairUsed: true,
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Assistant returned an invalid JSON step (AI_ASSISTANT_INVALID_JSON). Try a shorter goal.",
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

      logWarn("ai_assistant_tool_budget_exhausted", {
        ...logCtx,
        maxToolCalls: maxCalls,
      });
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Assistant did not produce a final answer within the tool budget.",
      });
    }),

  /** Single-shot drafting for observation intake; human must approve before submit. No DB writes beyond audit. */
  proposeObservationIntakeDraft: protectedMutation
    .input(
      orgScope.extend({
        contextHint: z.string().min(10).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RAG_READ);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.AI_DRAFT_USE);

      const logCtx: AssistantLogContext = {
        procedure: "aiAssistant.proposeObservationIntakeDraft",
        organizationId: input.organizationId,
      };

      return runRagBackedIntakeDraft({
        db: ctx.db,
        userId: ctx.user.id,
        organizationId: input.organizationId,
        contextHint: input.contextHint,
        logCtx,
        system: [
          "You propose field-ready text for an EHS safety observation intake form.",
          'Output JSON ONLY: {"suggestedSummary":"...","suggestedDetails":"...","citedChunkIds":["uuid"]}',
          "suggestedSummary: 2–120 chars headline. suggestedDetails: optional fuller notes.",
          "citedChunkIds: optional UUIDs copied EXACTLY from chunkId= lines in context; omit if none apply.",
        ].join(" "),
        userMessageIntro: "Worker context:\n",
        maxOutputTokens: { draft: 900, repair: 600 },
        parse: tryParseObservationIntakeDraft,
        repairSystem: OBSERVATION_INTAKE_JSON_REPAIR_SYSTEM,
        logEventRetry: "ai_assistant_obs_intake_parse_retry",
        logEventFailed: "ai_assistant_obs_intake_parse_failed",
        auditAction: "ai.assistant.observation_intake_draft",
      });
    }),

  /** Single-shot drafting for incident intake; human must edit before submit. No DB writes beyond audit. */
  proposeIncidentIntakeDraft: protectedMutation
    .input(
      orgScope.extend({
        contextHint: z.string().min(10).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RAG_READ);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.AI_DRAFT_USE);

      const logCtx: AssistantLogContext = {
        procedure: "aiAssistant.proposeIncidentIntakeDraft",
        organizationId: input.organizationId,
      };

      return runRagBackedIntakeDraft({
        db: ctx.db,
        userId: ctx.user.id,
        organizationId: input.organizationId,
        contextHint: input.contextHint,
        logCtx,
        system: [
          "You propose field-ready text for an EHS incident intake form (event report).",
          'Output JSON ONLY: {"suggestedTitle":"...","suggestedDescription":"...",',
          '"suggestedImmediateActions":"..." (optional),',
          '"suggestedSeverity":"low"|"medium"|"high"|"critical" (optional),',
          '"suggestedIncidentType":"injury"|"ill_health"|"near_miss"|"environmental"|"property_damage"|"other" (optional),',
          '"citedChunkIds":["uuid"]}',
          "suggestedTitle: short headline; suggestedDescription: what happened (required substantive text).",
          "citedChunkIds: optional UUIDs copied EXACTLY from chunkId= lines in context; omit if none apply.",
        ].join(" "),
        userMessageIntro: "Worker context:\n",
        maxOutputTokens: { draft: 900, repair: 600 },
        parse: tryParseIncidentIntakeDraft,
        repairSystem: INCIDENT_INTAKE_JSON_REPAIR_SYSTEM,
        logEventRetry: "ai_assistant_incident_intake_parse_retry",
        logEventFailed: "ai_assistant_incident_intake_parse_failed",
        auditAction: "ai.assistant.incident_intake_draft",
      });
    }),

  /** Draft inspection title, type, and notes; human submits the form. */
  proposeInspectionIntakeDraft: protectedMutation
    .input(
      orgScope.extend({
        contextHint: z.string().min(10).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RAG_READ);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.AI_DRAFT_USE);

      const logCtx: AssistantLogContext = {
        procedure: "aiAssistant.proposeInspectionIntakeDraft",
        organizationId: input.organizationId,
      };

      return runRagBackedIntakeDraft({
        db: ctx.db,
        userId: ctx.user.id,
        organizationId: input.organizationId,
        contextHint: input.contextHint,
        logCtx,
        system: [
          "You propose field-ready text for a workplace inspection intake form.",
          'Output JSON ONLY: {"suggestedTitle":"...","suggestedNotes":"..." (optional),',
          '"suggestedInspectionType":"routine"|"regulatory"|"pre_job"|"other" (optional),',
          '"citedChunkIds":["uuid"]}',
          "citedChunkIds optional from chunkId= lines.",
        ].join(" "),
        userMessageIntro: "Context:\n",
        maxOutputTokens: { draft: 900, repair: 600 },
        parse: tryParseInspectionIntakeDraft,
        repairSystem: INSPECTION_INTAKE_JSON_REPAIR_SYSTEM,
        logEventRetry: "ai_assistant_inspection_intake_parse_retry",
        logEventFailed: "ai_assistant_inspection_intake_parse_failed",
        auditAction: "ai.assistant.inspection_intake_draft",
      });
    }),

  /** Draft work permit intake fields from a short context hint; human submits the form. */
  proposePermitIntakeDraft: protectedMutation
    .input(
      orgScope.extend({
        contextHint: z.string().min(10).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RAG_READ);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.AI_DRAFT_USE);

      const logCtx: AssistantLogContext = {
        procedure: "aiAssistant.proposePermitIntakeDraft",
        organizationId: input.organizationId,
      };

      return runRagBackedIntakeDraft({
        db: ctx.db,
        userId: ctx.user.id,
        organizationId: input.organizationId,
        contextHint: input.contextHint,
        logCtx,
        system: [
          "You propose field-ready text for a PTW / work permit intake form.",
          'Output JSON ONLY: {"suggestedTitle":"...","suggestedWorkSummary":"...",',
          '"suggestedHazardsControls":"..." (optional),',
          '"suggestedPermitType":"hot_work"|"confined_space"|"work_at_height"|"other" (optional),',
          '"citedChunkIds":["uuid"]}',
          "suggestedWorkSummary: what work will be done and where (required).",
          "citedChunkIds: optional UUIDs from chunkId= lines; omit if none apply.",
        ].join(" "),
        userMessageIntro: "Context/Site/work:\n",
        maxOutputTokens: { draft: 900, repair: 600 },
        parse: tryParsePermitIntakeDraft,
        repairSystem: PERMIT_INTAKE_JSON_REPAIR_SYSTEM,
        logEventRetry: "ai_assistant_permit_intake_parse_retry",
        logEventFailed: "ai_assistant_permit_intake_parse_failed",
        auditAction: "ai.assistant.permit_intake_draft",
      });
    }),

  /** Draft CAPA title + details for the new CAPA form; human submits. */
  proposeCapaIntakeDraft: protectedMutation
    .input(
      orgScope.extend({
        contextHint: z.string().min(10).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RAG_READ);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.AI_DRAFT_USE);

      const logCtx: AssistantLogContext = {
        procedure: "aiAssistant.proposeCapaIntakeDraft",
        organizationId: input.organizationId,
      };

      return runRagBackedIntakeDraft({
        db: ctx.db,
        userId: ctx.user.id,
        organizationId: input.organizationId,
        contextHint: input.contextHint,
        logCtx,
        system: [
          "You draft ISO-style corrective action text from a supervisor hint.",
          'Output JSON ONLY: {"suggestedTitle":"...","suggestedDetails":"..." (20+ chars of concrete actions/root cause/context),',
          '"citedChunkIds":["uuid"]}',
          "citedChunkIds optional from chunkId= lines.",
        ].join(" "),
        userMessageIntro: "Context:\n",
        maxOutputTokens: { draft: 900, repair: 700 },
        parse: tryParseCapaIntakeDraft,
        repairSystem: CAPA_INTAKE_JSON_REPAIR_SYSTEM,
        logEventRetry: "ai_assistant_capa_intake_parse_retry",
        logEventFailed: "ai_assistant_capa_intake_parse_failed",
        auditAction: "ai.assistant.capa_intake_draft",
      });
    }),
});
