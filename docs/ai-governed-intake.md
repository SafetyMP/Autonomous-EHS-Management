# AI-governed intake (proposal-only)

Product rule (see [`CONTEXT.md`](../CONTEXT.md), [`COMPLIANCE.md`](../COMPLIANCE.md)): **LLM and client output are not authoritative** until validated and persisted through normal **permission-gated** mutations. AI must not auto-close investigations, auto-approve CAPAs, or silently set regulatory classifications.

## Priority surfaces (in-repo)

1. **`aiAssistant` router** — [`src/server/trpc/routers/aiAssistant.ts`](../src/server/trpc/routers/aiAssistant.ts)
   - **`proposeWithRagContext`:** bounded tool loop (`rag_search` → `final`); writes **`audit_log`** for the proposal; uses **`assertPermission`** for `RAG_READ` and `AI_DRAFT_USE`; PII-aware **`redactForPrompt`**.
   - **`proposeObservationIntakeDraft`:** single-shot draft for observation intake; human edits and submits via `observation.create`.
   - **`proposeIncidentIntakeDraft`:** incident intake proposal (`incident.create` still user-driven).
   - **`proposeInspectionIntakeDraft`**, **`proposePermitIntakeDraft`**, **`proposeCapaIntakeDraft`:** structured proposals for inspection, work permit, and CAPA create surfaces (same non-authoritative rules).
2. **`aiDrafts` router** — [`src/server/trpc/routers/aiDrafts.ts`](../src/server/trpc/routers/aiDrafts.ts) for other draft/proposal flows (same gates as product adds procedures).
3. **Gateway + rate limits** — all provider calls go through [`src/lib/ai/gateway.ts`](../src/lib/ai/gateway.ts); sensitive mutations use [`protectedMutation`](../src/server/trpc/init.ts) + Upstash patterns where configured.
4. **Optional local / VPC SLM flag** — [`src/lib/ai/localIntakeSlm.ts`](../src/lib/ai/localIntakeSlm.ts) with **`NEXT_PUBLIC_LOCAL_INTAKE_SLM`** ([`src/lib/env.ts`](../src/lib/env.ts)). The repo does **not** bundle an on-device model; any future client suggestion path must still **re-validate on the server** before regulated fields hit Postgres.

## Cost-conscious patterns (vs “AI EHS” marketing bundles)

- Default **`aiAssistant`** model chain uses **`AI_ASSISTANT_MODEL` / `AI_DRAFT_MODEL`** with a **mini** class default in code — suitable for structured JSON steps; escalate model tier only where quality data shows benefit.
- Prefer **small models** for **classification / JSON repair**; keep **RAG** retrieval narrow (`searchRagChunks` limits) to bound latency and token use.
- **Intake parity** with paid “copilots” is **governed drafting + faster forms**, not autonomous workflow transitions.

## Verification

- `npm run verify` — types and tests must stay green when extending assistants.
- New regulated fields: **Drizzle migration** + **`assertPermission`** + audit where siblings do.
