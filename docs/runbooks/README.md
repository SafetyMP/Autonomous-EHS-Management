# Operator runbooks

Day-2 procedures for platform engineers and integration administrators. Pair with [self-host-quickstart.md](../self-host-quickstart.md) and [README operators section](../../README.md#operators-and-integrations-self-host).

| Runbook | When to use |
|---------|-------------|
| [cron-metrics-observability.md](./cron-metrics-observability.md) | Prometheus scrape of `GET /api/cron/metrics`, SLO dashboards (`CRON_JOB_KEYS` parity; no production-monitored claim without scrape digests) |
| [evidence-binary-upload.md](./evidence-binary-upload.md) | Evidence stub honesty — no in-app binary upload claim until object-store live |
| [context-sync-provenance.md](./context-sync-provenance.md) | Context Sync REST, grants, rate limits |
| [audit-log-governance.md](./audit-log-governance.md) | Transactional `audit_log` exports and governance |
| [workday-hris-connector.md](./workday-hris-connector.md) | Workday → inbound webhook + SCIM |
| [adp-hris-connector.md](./adp-hris-connector.md) | ADP → inbound webhook + SCIM |
| [bamboohr-hris-connector.md](./bamboohr-hris-connector.md) | BambooHR → inbound webhook + SCIM |

**Related contracts:** [integration-inbound-contract.md](../integration-inbound-contract.md), [operational-webhooks.md](../operational-webhooks.md), [hris-portco-integration-playbook.md](../roadmap/hris-portco-integration-playbook.md).
