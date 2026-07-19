import { DashboardChrome } from "@/components/dashboard-chrome";

/**
 * Sole `/dashboard` layout entry (ADR-UX-002 / AC-012).
 * Chrome → Shell → AuthenticatedLayout — no parallel authenticated tree.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardChrome>{children}</DashboardChrome>;
}
