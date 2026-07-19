"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Optional installable progressive-web shortcut (ADR-UX-003 / AC-009 / D-006).
 * Does not advertise offline queue (flag may be off). Not a native App Store client.
 * `beforeinstallprompt` is Chromium-centric; Safari users see nothing (expected).
 */
export function PwaInstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    setBusy(true);
    setOutcome(null);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setOutcome(
        choice.outcome === "accepted"
          ? "Installable web shortcut accepted — look for EHS Console on your home screen."
          : "Install dismissed — you can keep using the site in the browser.",
      );
      setDeferred(null);
    } catch {
      setOutcome("Install could not complete. Try again from the browser menu.");
    } finally {
      setBusy(false);
    }
  }, [deferred]);

  if (dismissed || (!deferred && !outcome)) return null;

  return (
    <div
      role="region"
      aria-label="Install web shortcut"
      className="field-status-region shrink-0 rounded-lg border border-primary-soft-border bg-primary-soft text-base text-primary"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0">
          {deferred ? (
            <>
              <span className="font-semibold">Install EHS Console on this device</span>
              {" — "}
              optional installable web shortcut for quicker field access (responsive progressive web,
              not a native App Store or Play Store app).
            </>
          ) : (
            <span role="status" aria-live="polite">
              {outcome}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {deferred ? (
            <>
              <button
                type="button"
                onClick={() => void onInstall()}
                disabled={busy}
                aria-busy={busy}
                className="btn-primary touch-target"
              >
                {busy ? "Installing…" : "Install"}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="btn-secondary touch-target"
              >
                Not now
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="btn-secondary touch-target"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
