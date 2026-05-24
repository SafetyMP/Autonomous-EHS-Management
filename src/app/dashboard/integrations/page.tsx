"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { IntegrationsPlatformPanel } from "@/components/dashboard/integrations-platform-panel";
import { PortCoIdentityPanel } from "@/components/dashboard/portco-identity-panel";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfHelperXs,
  dfMuted,
  dfPanelHeading,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { INTEGRATION_CONNECTOR_KEYS } from "@/lib/integration/connectorKeys";
import { CONNECTOR_PRESETS } from "@/lib/integration/connectorPresets";
import type { OperationalWebhookEventId } from "@/lib/operationalWebhook/eventTypes";
import { OPERATIONAL_WEBHOOK_EVENT_IDS } from "@/lib/operationalWebhook/eventTypes";
import { trpc } from "@/trpc/react";

function operationalHookSubsDefault(): Record<OperationalWebhookEventId, boolean> {
  const record = {} as Record<OperationalWebhookEventId, boolean>;
  for (const k of OPERATIONAL_WEBHOOK_EVENT_IDS) record[k] = true;
  return record;
}

function ConnectorMappingsEditor({ organizationId }: { organizationId: string }) {
  const utils = trpc.useUtils();

  type ConnectorKey = (typeof INTEGRATION_CONNECTOR_KEYS)[number];
  const [connectorKey, setConnectorKey] = useState<ConnectorKey>("lms_inbound");
  const [schemaVersion, setSchemaVersion] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState("{}");
  const [connectorErr, setConnectorErr] = useState<string | null>(null);

  const mappingsQuery = trpc.integration.listConnectorMappings.useQuery({
    organizationId,
  });

  const syncedDraft = useMemo(() => {
    const row = mappingsQuery.data?.find((r) => r.connectorKey === connectorKey);
    if (!row?.mappingJson) return "{}";
    try {
      return JSON.stringify(row.mappingJson, null, 2);
    } catch {
      return "{}";
    }
  }, [connectorKey, mappingsQuery.data]);

  const displayDraft = dirty ? draft : syncedDraft;

  const upsertMapping = trpc.integration.upsertConnectorMapping.useMutation({
    async onSuccess() {
      await utils.integration.listConnectorMappings.invalidate({ organizationId });
      setDirty(false);
      setConnectorErr(null);
    },
  });

  function onConnectorSelect(next: ConnectorKey) {
    setDirty(false);
    setConnectorKey(next);
  }

  function saveConnectorMapping() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(displayDraft) as Record<string, unknown>;
      if (parsed === null || typeof parsed !== "object") {
        setConnectorErr("Mapping must decode to an object.");
        return;
      }
    } catch {
      setConnectorErr("Invalid JSON.");
      return;
    }
    upsertMapping.mutate({
      organizationId,
      connectorKey,
      mappingJson: parsed,
      schemaVersion,
    });
  }

  function applyPreset(vendor: string) {
    const preset = CONNECTOR_PRESETS.find((p) => p.vendor === vendor);
    if (!preset) return;
    setDirty(true);
    setConnectorKey(preset.connectorKey);
    setSchemaVersion(preset.schemaVersion);
    setDraft(JSON.stringify(preset.mappingJson, null, 2));
    setConnectorErr(null);
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="Connector mappings">
      <h2 className={dfPanelHeading}>Connector field mapping</h2>
      <p className={`mt-2 text-sm ${dfMuted}`}>
        Apply a vendor preset or edit JSON mapping for LMS/HRIS inbound envelopes. Presets align with{" "}
        <code className="text-xs">docs/roadmap/hris-portco-integration-playbook.md</code>.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CONNECTOR_PRESETS.map((p) => (
          <button
            key={p.vendor}
            type="button"
            className={`${dfSecondaryOutline} text-xs`}
            onClick={() => applyPreset(p.vendor)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-800">
          Connector
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
            value={connectorKey}
            onChange={(e) => onConnectorSelect(e.target.value as ConnectorKey)}
          >
            {INTEGRATION_CONNECTOR_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`${dfSecondaryOutline} disabled:opacity-50`}
          disabled={upsertMapping.isPending}
          onClick={() => saveConnectorMapping()}
        >
          {upsertMapping.isPending ? "Saving…" : "Save mapping"}
        </button>
      </div>
      {connectorErr ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {connectorErr}
        </p>
      ) : null}
      {upsertMapping.error ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {upsertMapping.error.message}
        </p>
      ) : null}
      <textarea
        className="mt-3 min-h-[10rem] w-full rounded border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs text-zinc-900"
        spellCheck={false}
        value={displayDraft}
        onChange={(e) => {
          setDirty(true);
          setDraft(e.target.value);
        }}
      />
      {mappingsQuery.data && mappingsQuery.data.length > 0 ? (
        <ul className={`mt-3 ${dfHelperXs} list-disc pl-5 text-zinc-700`}>
          {mappingsQuery.data.map((m) => (
            <li key={m.id}>
              <span className="font-mono">{m.connectorKey}</span> — schema v{m.schemaVersion} — updated{" "}
              {new Date(m.updatedAt).toLocaleString()}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OperationalWebhooksAdmin({ organizationId }: { organizationId: string }) {
  const utils = trpc.useUtils();
  const whPanel = trpc.organization.operationalWebhooksPanel.useQuery({ organizationId });

  const [hookUrl, setHookUrl] = useState("");
  const [hookSecret, setHookSecret] = useState("");
  const [hookSubs, setHookSubs] = useState<Record<OperationalWebhookEventId, boolean>>(
    operationalHookSubsDefault(),
  );

  const createHook = trpc.organization.createOperationalWebhook.useMutation({
    async onSuccess() {
      await utils.organization.operationalWebhooksPanel.invalidate({ organizationId });
      setHookUrl("");
      setHookSecret("");
      setHookSubs(operationalHookSubsDefault());
    },
  });

  const updateHook = trpc.organization.updateOperationalWebhook.useMutation({
    async onSuccess() {
      await utils.organization.operationalWebhooksPanel.invalidate({ organizationId });
    },
  });

  const deleteHook = trpc.organization.deleteOperationalWebhook.useMutation({
    async onSuccess() {
      await utils.organization.operationalWebhooksPanel.invalidate({ organizationId });
    },
  });

  function toggleSubscription(id: OperationalWebhookEventId, next: boolean) {
    setHookSubs((prev) => ({ ...prev, [id]: next }));
  }

  async function submitNewWebhook(ev: FormEvent) {
    ev.preventDefault();
    const subs = OPERATIONAL_WEBHOOK_EVENT_IDS.filter((k) => hookSubs[k]);
    if (!subs.length) {
      alert("Pick at least one event subscription.");
      return;
    }
    await createHook.mutateAsync({
      organizationId,
      targetUrl: hookUrl.trim(),
      secret: hookSecret.trim() ? hookSecret.trim() : undefined,
      subscribedEvents: subs as [OperationalWebhookEventId, ...OperationalWebhookEventId[]],
    });
  }

  if (!whPanel.data?.allowed) {
    return null;
  }

  const selectedSubs = OPERATIONAL_WEBHOOK_EVENT_IDS.filter((k) => hookSubs[k]);

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm" aria-label="Operational webhooks">
      <h2 className={dfPanelHeading}>Operational webhooks (org admin)</h2>
      <p className={`mt-2 text-sm ${dfMuted}`}>
        HTTPS POST targets receive JSON when observation follow-up SLAs breach, approval steps go overdue, contractor
        credentials expire in bulk, or HRIS inbound processing fails. Optional HMAC header{" "}
        <code className="text-xs">X-EHS-Signature</code>.
      </p>
      <form className="mt-4 space-y-3 rounded border border-zinc-200 bg-white p-3" onSubmit={(e) => void submitNewWebhook(e)}>
        <label className="flex flex-col gap-1 text-sm text-zinc-800">
          Target URL
          <input
            type="url"
            required
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={hookUrl}
            onChange={(e) => setHookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-800">
          Shared secret (optional, min 16 chars)
          <input
            type="password"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={hookSecret}
            onChange={(e) => setHookSecret(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <fieldset className="space-y-2 text-sm text-zinc-800">
          <legend className="font-medium">Subscribe to</legend>
          {OPERATIONAL_WEBHOOK_EVENT_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(hookSubs[id])}
                onChange={(e) => toggleSubscription(id, e.target.checked)}
              />
              <code className="text-xs">{id}</code>
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          className={`${dfSecondaryOutline} disabled:opacity-50`}
          disabled={createHook.isPending || selectedSubs.length === 0}
        >
          {createHook.isPending ? "Creating…" : "Add webhook"}
        </button>
        {createHook.error ? (
          <p className="text-sm text-red-800" role="alert">
            {createHook.error.message}
          </p>
        ) : null}
      </form>

      {whPanel.data.endpoints.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {whPanel.data.endpoints.map((ep) => (
            <li key={ep.id} className="rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-900">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs break-all">{ep.targetUrl}</p>
                  <p className={`${dfHelperXs} mt-1`}>
                    secret: {ep.hasSecretConfigured ? "configured" : "none"} · enabled:{" "}
                    {ep.enabled ? "yes" : "no"}
                  </p>
                  <p className={`${dfHelperXs}`}>events: {ep.subscribedEvents.join(", ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${dfSecondaryOutline} text-xs`}
                    onClick={() =>
                      updateHook.mutate({
                        organizationId,
                        endpointId: ep.id,
                        enabled: !ep.enabled,
                      })
                    }
                  >
                    {ep.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900"
                    onClick={() => {
                      if (!confirm("Delete this webhook endpoint?")) return;
                      deleteHook.mutate({ organizationId, endpointId: ep.id });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mt-3 text-sm ${dfMuted}`}>No operational webhooks configured yet.</p>
      )}
    </section>
  );
}

export default function IntegrationsPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();
  const [exportBusy, setExportBusy] = useState(false);

  const listQuery = trpc.integration.listEvents.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const failedHealth = trpc.integration.failedEventsHealth.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const reprocess = trpc.integration.reprocessFailedEvent.useMutation({
    async onSuccess() {
      await utils.integration.listEvents.invalidate();
      await utils.integration.failedEventsHealth.invalidate();
    },
  });

  async function downloadNdjson() {
    if (!organizationId) return;
    setExportBusy(true);
    try {
      const slice = await utils.client.integration.exportEventsWarehouseSlice.query({
        organizationId,
        limit: 500,
      });
      const blob = new Blob([slice.body], {
        type: "application/x-ndjson;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `integration-events-${organizationId}-${new Date().toISOString().slice(0, 10)}.ndjson`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportBusy(false);
    }
  }

  if (!organizationId) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Select an organization</p>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={dfSectionHeading}>Integrations</h1>
          <p className={`mt-1 text-base ${dfMuted}`}>
            Recent LMS / HRIS integration events visible with <code className="text-sm">integration:read</code>. Use
            warehouse export for lake / CDC pipelines.
          </p>
          <p className={`mt-2 ${dfHelperXs}`}>
            Inbound webhook: <code className="text-xs">POST /api/integration/inbound</code> with Bearer{" "}
            <code className="text-xs">INTEGRATION_INBOUND_SECRET</code>; optional JSON field{" "}
            <code className="text-xs">idempotencyKey</code> for safe replays (cached responses stored in Postgres). With{" "}
            <code className="text-xs">PG_BOSS_ENABLED=true</code>, HRIS payloads return <code className="text-xs">202</code>{" "}
            and complete in the job worker—see <code className="text-xs">docs/JOB_QUEUE.md</code>.
          </p>
          <p className={`mt-2 ${dfHelperXs}`}>
            Connector mapping contract: <code className="text-xs">docs/integration-connector-mapping.md</code>.{" "}
            Operational webhooks: <code className="text-xs">docs/operational-webhooks.md</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`${dfSecondaryOutline} disabled:opacity-50`}
            disabled={exportBusy || listQuery.isError}
            onClick={() => void downloadNdjson()}
          >
            {exportBusy ? "Preparing export…" : "Download NDJSON (500 newest)"}
          </button>
          <OrgSwitcher />
        </div>
      </div>

      <IntegrationsPlatformPanel organizationId={organizationId} />

      <PortCoIdentityPanel organizationId={organizationId} />

      <ConnectorMappingsEditor key={`${organizationId}:connector-mappings`} organizationId={organizationId} />

      <OperationalWebhooksAdmin key={`${organizationId}:operational-webhooks`} organizationId={organizationId} />

      {listQuery.isLoading ? (
        <p className="text-base text-zinc-600" role="status">
          Loading integration events…
        </p>
      ) : null}
      {listQuery.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900" role="alert">
          {listQuery.error.message}
        </p>
      ) : null}

      {failedHealth.data && failedHealth.data.failedCount > 0 ? (
        <section
          id="integration-failed"
          className="rounded-lg border border-red-200 bg-red-50/95 p-4 shadow-sm"
          aria-label="Failed integration events"
        >
          <h2 className={dfPanelHeading}>Failed events ({failedHealth.data.failedCount})</h2>
          <p className={`mt-2 text-sm ${dfMuted}`}>
            Oldest:{" "}
            {failedHealth.data.oldestFailedCreatedAt
              ? new Date(failedHealth.data.oldestFailedCreatedAt).toLocaleString()
              : "—"}
            . Requires <code className="text-xs">integration:write</code> to retry (
            <code className="text-xs">integration.reprocessFailedEvent</code>).
          </p>
          <ul className="mt-3 divide-y divide-red-100 text-sm">
            {failedHealth.data.recentFailed.map((ev, idx) => (
              <li key={`${ev.id}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">{ev.eventType}</p>
                  <p className="font-mono text-xs text-zinc-600">{ev.id}</p>
                  <p className="mt-1 text-xs text-red-900/90">
                    {ev.processingError ? ev.processingError.slice(0, 240) : "No error message stored."}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                    {new Date(ev.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className={`${dfSecondaryOutline} shrink-0 disabled:opacity-50`}
                  disabled={reprocess.isPending}
                  onClick={() => void reprocess.mutateAsync({ organizationId, eventId: ev.id })}
                >
                  Retry
                </button>
              </li>
            ))}
          </ul>
          {reprocess.error ? (
            <p className="mt-2 text-sm text-red-800" role="alert">
              {reprocess.error.message}
            </p>
          ) : null}
          {reprocess.data ? (
            <p className="mt-2 text-sm text-emerald-900">
              Replay {reprocess.data.queued ? "queued for worker" : "completed inline"}.
            </p>
          ) : null}
        </section>
      ) : null}

      {listQuery.data && listQuery.data.length === 0 ? (
        <p className={`${dfMuted} text-base`}>No integration events recorded for this organization yet.</p>
      ) : null}

      {listQuery.data && listQuery.data.length > 0 ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="Integration events">
          <h2 className={dfPanelHeading}>Recent events (last 100)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-zinc-900">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-600">
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Id</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data.map((ev, idx) => (
                  <tr key={`${ev.id}-${idx}`} className="border-b border-zinc-100 last:border-none">
                    <td className="py-2 pr-3 tabular-nums text-zinc-800">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 font-medium">{ev.eventType}</td>
                    <td className="py-2 pr-3">{ev.processingStatus}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{ev.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
