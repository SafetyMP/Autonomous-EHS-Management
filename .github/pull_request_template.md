## Summary

-

## Tracking

- Fixes / refs:
- Screenshots / Loom / deploy preview (optional):

---

## Verification (paste evidence)

| Check                         | Evidence (paste command output snippet or Actions run URL / job name) |
| ----------------------------- | --------------------------------------------------------------------- |
| `supply-chain-audit` job (CI) | ✅ / ⏭️                                                                  |
| `npm run lint`                | ✅ / ⏭️                                                                  |
| `npx tsc --noEmit`            | ✅ / ⏭️                                                                  |
| `npm test` (Vitest)           | ✅ / ⏭️                                                                  |
| `npm run test:e2e:smoke` @smoke | ✅ / ⏭️                                                                  |

> PR authors must paste output or CI links for failing checks explaining why **skip** applies.

---

## Areas touched

- [ ] Frontend / dashboards
- [ ] tRPC routers / server (`src/server/`)
- [ ] Database schema / migrations (`src/server/db/`, `drizzle/migrations/`)
- [ ] Auth / RBAC (`src/lib/rbac.ts`, Better Auth flows)
- [ ] Compliance / retention / RAG / AI gateway (see **`COMPLIANCE.md`** — link subsection)
- [ ] CI/CD / infra only (`Dockerfile`, `deploy/k8s/`, `.github/workflows/`)

## Compliance acknowledgement

Use when any box under “regulated” areas applies:

- [ ] I linked the compliance issue and stated migration / rollback / retention impact.
- [ ] No weakening of RBAC or audit trail intentionally introduced.
