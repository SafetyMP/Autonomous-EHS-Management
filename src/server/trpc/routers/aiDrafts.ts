import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { environmentalAspect, aspectSignificanceEnum } from "@/server/db/schema";
import { getAiGateway } from "@/lib/ai/gateway";
import { redactForPrompt } from "@/lib/pii/redact";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, router } from "../init";

const sig = aspectSignificanceEnum.enumValues as [string, ...string[]];

const aspectDraftSchema = z.object({
  name: z.string(),
  activity: z.string().optional(),
  description: z.string().optional(),
  environmentalImpact: z.string().optional(),
  significance: z.enum(sig),
});

export const aiDraftsRouter = router({
  suggestAspectDraft: protectedMutation
    .input(orgScope.extend({ contextHint: z.string().min(3).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.AI_DRAFT_USE);

      const gateway = getAiGateway();
      const safeHint = redactForPrompt(input.contextHint);
      const model = process.env.AI_DRAFT_MODEL ?? "gpt-4o-mini";

      const tryParse = (s: string): unknown => {
        try {
          return JSON.parse(s) as unknown;
        } catch {
          return null;
        }
      };

      let raw = await gateway.completeJson({
        model,
        system:
          "You output only valid JSON for an environmental aspect register row. Keys: name, activity?, description?, environmentalImpact?, significance (low|medium|high).",
        user: `Propose one aspect based on: ${safeHint}`,
      });

      let data = tryParse(raw);
      let parsed = data !== null ? aspectDraftSchema.safeParse(data) : null;
      if (!parsed?.success) {
        raw = await gateway.completeJson({
          model,
          system:
            "Convert the user message into valid JSON only. Keys: name (string), activity (optional string), description (optional string), environmentalImpact (optional string), significance (low|medium|high). No markdown, no prose outside JSON.",
          user: raw,
          maxOutputTokens: 512,
        });
        data = tryParse(raw);
        parsed = data !== null ? aspectDraftSchema.safeParse(data) : null;
      }
      if (!parsed?.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Model returned invalid JSON shape." });
      }

      return { draft: parsed.data, accepted: false as const };
    }),

  applyAspectDraft: protectedMutation
    .input(
      orgScope.extend({
        siteId: z.string().uuid().optional(),
        draft: aspectDraftSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ASPECT_CREATE);

      const [row] = await ctx.db
        .insert(environmentalAspect)
        .values({
          organizationId: input.organizationId,
          siteId: input.siteId ?? null,
          name: input.draft.name,
          activity: input.draft.activity ?? null,
          description: input.draft.description ?? null,
          environmentalImpact: input.draft.environmentalImpact ?? null,
          significance: input.draft.significance as (typeof aspectSignificanceEnum.enumValues)[number],
        })
        .returning();

      return { applied: true, aspect: row };
    }),
});
