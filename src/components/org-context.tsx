"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react";

import { organizationPreferenceKey, resolveOrganizationPreference } from "@/lib/dashboard/organizationPreference";

export type OrgRow = { id: string; name: string };

const OrgContext = createContext<{
  organizations: OrgRow[];
  organizationId: string | null;
  setOrganizationId: (id: string) => void;
} | null>(null);

export function OrgProvider({
  organizations,
  userId,
  children,
}: {
  organizations: OrgRow[];
  userId: string;
  children: React.ReactNode;
}) {
  const [organizationId, setOrganizationIdState] = useState<string | null>(
    null,
  );

  const storageKey = organizationPreferenceKey(userId);
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.sessionStorage.getItem(storageKey); } catch { /* Storage is optional. */ }
    // Membership comes from the authenticated server response, never browser storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore validated client preference after hydration
    setOrganizationIdState(resolveOrganizationPreference(saved, organizations));
  }, [organizations, storageKey]);

  const setOrganizationId = useCallback((id: string) => {
    if (!organizations.some((org) => org.id === id)) return;
    setOrganizationIdState(id);
    try { window.sessionStorage.setItem(storageKey, id); } catch { /* In-memory selection still works. */ }
  }, [organizations, storageKey]);

  const value = useMemo(() => ({
    organizations,
    organizationId: resolveOrganizationPreference(organizationId, organizations),
    setOrganizationId,
  }), [organizations, organizationId, setOrganizationId]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
