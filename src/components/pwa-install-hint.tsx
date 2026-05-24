"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Shows a dismissible banner when the browser can install the PWA.
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
          ? "App install accepted — look for the icon on your home screen."
          : "Install dismissed — you can use the site in the browser as usual.",
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
      aria-label="Install app"
      className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-base text-emerald-950"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0">
          {deferred ? (
            <>
              <span className="font-semibold">Install EHS Console on this device</span> — opens like an app
              for quicker field access (offline queue works in the browser).
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
                className="touch-target rounded-md bg-emerald-800 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
              >
                {busy ? "Installing…" : "Install"}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="touch-target rounded-md border border-zinc-400 bg-white px-4 py-2 text-base font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Not now
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="touch-target rounded-md border border-zinc-400 bg-white px-4 py-2 text-base font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
