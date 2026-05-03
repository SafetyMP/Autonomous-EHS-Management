"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function syncOnline() {
      setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    }
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] shrink-0 border-b border-amber-400 bg-amber-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-center text-base font-semibold text-amber-950"
    >
      You appear to be offline. Checking connection — actions may fail until you are back
      online.
    </div>
  );
}
