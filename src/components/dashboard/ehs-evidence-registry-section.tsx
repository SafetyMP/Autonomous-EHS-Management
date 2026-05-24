"use client";

import { useState } from "react";
import {
  dfControl,
  dfHelperXs,
  dfInlineNavLink,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export function EhsEvidenceRegistrySection({
  organizationId,
  entityType,
  entityId,
  canRegister,
}: {
  organizationId: string;
  entityType: "incident" | "corrective_action";
  entityId: string;
  canRegister: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.ehsEvidence.list.useQuery(
    { organizationId, entityType, entityId },
    { enabled: !!organizationId && !!entityId },
  );

  const [fileName, setFileName] = useState("");
  const [mimeType] = useState("application/octet-stream");
  const [byteSize, setByteSize] = useState("");
  const [storageUri, setStorageUri] = useState("");

  const register = trpc.ehsEvidence.register.useMutation({
    onSuccess: () => {
      void utils.ehsEvidence.list.invalidate({ organizationId, entityType, entityId });
      setFileName("");
      setByteSize("");
      setStorageUri("");
    },
  });

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className={dfPanelHeading}>Evidence registry</h2>
      <p className={`mt-1 ${dfHelperXs}`}>
        Register storage URIs after upload via your org pipeline. Binary upload stub is not
        production-ready — use HTTPS or approved URI schemes only.
      </p>
      {isLoading ? (
        <p className={`mt-2 ${dfMuted}`} role="status">
          Loading evidence…
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {(rows ?? []).length === 0 ? (
            <li className="py-2 text-zinc-600">No evidence registered yet.</li>
          ) : (
            (rows ?? []).map((r) => (
              <li key={r.id} className="py-2">
                <span className="font-medium">{r.fileName}</span>
                {r.storageUri.match(/^https?:\/\//i) ? (
                  <a
                    href={r.storageUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`ml-2 ${dfInlineNavLink}`}
                  >
                    Open
                  </a>
                ) : (
                  <code className="ml-2 text-xs">{r.storageUri}</code>
                )}
              </li>
            ))
          )}
        </ul>
      )}
      {canRegister ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const size = Number(byteSize);
            if (!Number.isFinite(size) || size < 1) return;
            register.mutate({
              organizationId,
              entityType,
              entityId,
              fileName,
              mimeType,
              byteSize: size,
              storageUri,
            });
          }}
        >
          <input
            required
            placeholder="File name"
            className={dfControl}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <input
            required
            placeholder="Storage URI"
            className={dfControl}
            value={storageUri}
            onChange={(e) => setStorageUri(e.target.value)}
          />
          <input
            required
            placeholder="Byte size"
            type="number"
            min={1}
            className={dfControl}
            value={byteSize}
            onChange={(e) => setByteSize(e.target.value)}
          />
          <button type="submit" disabled={register.isPending} className={dfPrimarySubmit}>
            Register URI
          </button>
          {register.error ? (
            <p className="text-sm text-red-800" role="alert">
              {register.error.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
