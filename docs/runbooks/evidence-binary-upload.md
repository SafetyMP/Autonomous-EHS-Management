# Evidence binary upload — honesty runbook

**R-011 / D-009.** This runbook states what is **not** production-true today so procurement and ops do not oversell in-app binary evidence.

## Current path

| Surface | Behavior |
|---------|----------|
| `POST /api/evidence-upload-stub` | Returns **501** JSON `{ stub: true, ... }` — placeholder only |
| `ehsEvidence.register` (tRPC) | Registers **metadata** + `storageUri` after bytes already live at an org-approved URI |
| Object-store signed upload (S3/GCS/Blob) | **Not shipped** as a turnkey product path in this repo |

## Claims allowed vs forbidden

| Allowed | Forbidden until object-store + DLP/encryption controls are live |
|---------|------------------------------------------------------------------|
| “Operators may register evidence metadata pointing at an approved URI” | “Production in-app binary evidence upload” |
| “Stub endpoint documents the future signed-URL flow” | Implying virus scanning, tenant object-store tenancy, or DLP from the stub |

## Unlock checklist (when implementing later)

1. Choose object-store vendor + encryption / DLP / subprocessor attestations (counsel + security).
2. Signed upload → `ehsEvidence.register` with size/type policy + retention/hold alignment.
3. Record artifact ID on barrier **D-009** and flip status only then.

See [`COMPLIANCE.md`](../../COMPLIANCE.md) (*Attachment and blob storage*) and ranked portfolio **P4**.
