import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardSiteHeader } from "@/components/dashboard-site-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <DashboardSiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
      >
        <DashboardShell>{children}</DashboardShell>
      </main>
    </div>
  );
}
