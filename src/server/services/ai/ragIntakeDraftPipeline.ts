import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { AiGateway } from "@/lib/ai/gateway";
import { getAiGateway } from "@/lib/ai/gateway";
import { logWarn } from "@/lib/logger";
import { redactForPrompt } from "@/lib/pii/redact";
import type { Db } from "@/server/db";
import { writeAuditLog } from "@/server/services/audit";
import { searchRagChunks } from "@/server/services/ragSearch";

export type AssistantLogContext = { procedure: string; organizationId: string };

export async function gatewayCompleteJson(
  gateway: AiGateway,
  args: Parameters<AiGateway["completeJson"]>[0],
  logCtx?: AssistantLogContext,
): Promise<string> {
  try {
    return await gateway.completeJson(args);
  } catch (e) {
    logWarn("ai_assistant_gateway_error", {
      message: e instanceof Error ? e.message : String(e),
      procedure: logCtx?.procedure,
      organizationId: logCtx?.organizationId,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "AI gateway request failed or timed out (AI_GATEWAY_ERROR). Try again shortly or contact support.",
    });
  }
}

async function writeAssistantDraftParseFailureAudit(
  db: Pick<Db, "insert">,
  args: {
    organizationId: string;
    actorUserId: string;
    procedure: string;
    model: string;
  },
): Promise<void> {
  await writeAuditLog(db, {
    organizationId: args.organizationId,
    actorUserId: args.actorUserId,
    action: "ai.assistant.draft_parse_failed",
    entityType: "ai_assistant_session",
    entityId: randomUUID(),
    payload: {
      procedure: args.procedure,
      model: args.model,
    },
  });
}

type ParseResult<T> = { success: true; data: T } | { success: false };

export async function runRagBackedIntakeDraft<T extends { citedChunkIds?: string[] }>(params: {
  db: Db;
  userId: string;
  organizationId: string;
  contextHint: string;
  logCtx: AssistantLogContext;
  system: string;
  /** Included before the redacted hint (e.g. `Worker context:\n` or `Context/Site/work:\n`). */
  userMessageIntro: string;
  maxOutputTokens: { draft: number; repair: number };
  parse: (raw: string) => ParseResult<T>;
  repairSystem: string;
  logEventRetry: string;
  logEventFailed: string;
  auditAction: string;
}): Promise<T> {
  const {
    db,
    userId,
    organizationId,
    contextHint,
    logCtx,
    system,
    userMessageIntro,
    maxOutputTokens,
    parse,
    repairSystem,
    logEventRetry,
    logEventFailed,
    auditAction,
  } = params;

  const gateway = getAiGateway();
  const model =
    process.env.AI_ASSISTANT_MODEL ?? process.env.AI_DRAFT_MODEL ?? "gpt-4o-mini";
  const safeHint = redactForPrompt(contextHint.trim());

  const hits = await searchRagChunks(db, {
    organizationId,
    query: safeHint.slice(0, 256),
    limit: 8,
  });

  const ragDigest = hits
    .map(
      (h) =>
        `chunkId=${h.chunkId} (${h.sourceTitle}): ${redactForPrompt(h.excerpt.slice(0, 400))}`,
    )
    .join("\n");

  const userBody = `${userMessageIntro}${safeHint}\n\nContext passages:\n${ragDigest || "(no corpus hits)"}`;

  let raw = await gatewayCompleteJson(
    gateway,
    {
      model,
      system,
      user: userBody,
      maxOutputTokens: maxOutputTokens.draft,
    },
    logCtx,
  );

  let parsed = parse(raw);
  if (!parsed.success) {
    logWarn(logEventRetry, {
      ...logCtx,
      jsonRepairAttempt: true,
      rawHead: raw.slice(0, 120),
    });
    raw = await gatewayCompleteJson(
      gateway,
      {
        model,
        system: repairSystem,
        user: raw,
        maxOutputTokens: maxOutputTokens.repair,
      },
      logCtx,
    );
    parsed = parse(raw);
  }

  if (!parsed.success) {
    logWarn(logEventFailed, {
      ...logCtx,
      jsonRepairUsed: true,
    });
    await writeAssistantDraftParseFailureAudit(db, {
      organizationId,
      actorUserId: userId,
      procedure: logCtx.procedure,
      model,
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Assistant draft was not valid JSON (AI_ASSISTANT_INVALID_JSON).",
    });
  }

  const data = parsed.data;
  await writeAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: auditAction,
    entityType: "ai_assistant_session",
    entityId: randomUUID(),
    payload: {
      citedChunkIds: data.citedChunkIds ?? [],
      hintRedactedPrefix: safeHint.slice(0, 200),
      model,
    },
  });

  return data;
}
