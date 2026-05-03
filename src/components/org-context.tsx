"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type OrgRow = { id: string; name: string };

const OrgContext = createContext<{
  organizations: OrgRow[];
  organizationId: string | null;
  setOrganizationId: (id: string) => void;
} | null>(null);

export function OrgProvider({
  organizations,
  children,
}: {
  organizations: OrgRow[];
  children: React.ReactNode;
}) {
  const [organizationId, setOrganizationIdState] = useState<string | null>(
    null,
  );

  const setOrganizationId = useCallback((id: string) => {
    setOrganizationIdState(id);
  }, []);

  const value = useMemo(() => {
    const effectiveId =
      organizationId ??
      (organizations.length === 1 ? organizations[0].id : null);
    return {
      organizations,
      organizationId: effectiveId,
      setOrganizationId,
    };
  }, [organizations, organizationId, setOrganizationId]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
