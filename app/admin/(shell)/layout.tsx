import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-guard";

// Reading the session is request-time work, so it sits behind Suspense
// (cacheComponents is on). Pages call requireAdmin() again themselves: a
// layout is not re-rendered on every client navigation.
export default function ShellLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh" role="status" aria-label="Loading admin" />
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <AdminShell user={{ name: admin.name, email: admin.email }}>
      {children}
    </AdminShell>
  );
}
