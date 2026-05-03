"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** SSR / hydration default: assume online so forms are usable until browser reports otherwise. */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Tracks `navigator.onLine` with `online` / `offline` events.
 * Prefer this over duplicating listeners on every form.
 */
export function useNavigatorOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
