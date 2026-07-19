# RAG redaction & permission runbook

**Not legal advice.** Redaction patterns are technical minimization aids. They do **not** make a DPIA, lawful-basis assessment, or “GDPR-compliant RAG” claim without counsel.

## Default posture (R-012)

| Control | Default | Where |
|---------|---------|--------|
| Ingest redaction | **On** (always applied; no opt-out flag) | `rag.ingest` → [`redactForRagIngest`](../../src/lib/pii/redact.ts) before chunk/embed persist |
| Prompt redaction | **On** for assistant / draft hints | [`redactForPrompt`](../../src/lib/pii/redact.ts) in `aiAssistant` / draft pipelines |
| Existing-source backfill | Operator-triggered | `rag.redactExistingSource` re-applies current patterns; clears embeddings when text changes |

There is **no** environment switch to disable ingest redaction. Treat unredacted corpus text as a defect, not a configuration choice.

## Permission gates

| Permission key | Constant | Required for |
|----------------|----------|----------------|
| `rag:read` | `PERMISSIONS.RAG_READ` | RAG search / retrieval; AI paths that call `rag_search` |
| `rag:ingest` | `PERMISSIONS.RAG_INGEST` | `rag.ingest`, `rag.redactExistingSource`, embedding backfill mutations |
| `ai:draft_use` (product key) | `PERMISSIONS.AI_DRAFT_USE` | `aiAssistant` / `aiDrafts` propose procedures |

Procedures call `assertPermission` with these keys. AI drafts remain **proposal-only** — humans persist via domain mutations ([`docs/ai-governed-intake.md`](../ai-governed-intake.md)).

## Operator checklist

1. Confirm role grants for corpus admins (`rag:ingest`) vs readers (`rag:read`) vs draft assistants (`AI_DRAFT_USE`).
2. After changing redaction patterns, run `rag.redactExistingSource` on sensitive sources and re-embed as needed.
3. Do **not** market RAG as DPIA-complete, certification-ready, or free of residual PII risk without counsel sign-off.

## Related

- [`COMPLIANCE.md`](../../COMPLIANCE.md) — RAG minimization backfill note
- [`docs/ai-governed-intake.md`](../ai-governed-intake.md) — proposal-only AI contract
- Barrier counsel blockers in [`docs/barrier-resolution-playbook.md`](../barrier-resolution-playbook.md)
