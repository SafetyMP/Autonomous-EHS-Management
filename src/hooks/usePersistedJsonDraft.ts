"use client";

import { useEffect, useRef, useState } from "react";

/**
 * JSON draft persistence for field intake forms (inspections, permits, etc.).
 */
export function usePersistedJsonDraft<T extends Record<string, unknown>>(
  storageKey: string | null,
  initial: T,
): {
  draft: T;
  setDraftField: <K extends keyof T>(key: K, value: T[K]) => void;
  restored: boolean;
  clearDraft: () => void;
} {
  const [draft, setDraft] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const hydrateDone = useRef(false);
  const skipPersist = useRef(true);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      hydrateDone.current = true;
      skipPersist.current = false;
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<T>;
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          /* eslint-disable react-hooks/set-state-in-effect -- client-only draft restore from localStorage */
          setDraft((prev) => ({ ...prev, ...parsed }));
          setRestored(true);
          /* eslint-enable react-hooks/set-state-in-effect */
        }
      }
    } catch {
      /* ignore corrupt draft */
    }
    hydrateDone.current = true;
    skipPersist.current = false;
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !hydrateDone.current || skipPersist.current || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      /* quota */
    }
  }, [draft, storageKey]);

  function setDraftField<K extends keyof T>(key: K, value: T[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function clearDraft() {
    skipPersist.current = true;
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* noop */
      }
    }
    setDraft(initial);
    setRestored(false);
    queueMicrotask(() => {
      skipPersist.current = false;
    });
  }

  return { draft, setDraftField, restored, clearDraft };
}
