import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminRoot } from "@/components/admin/admin-root";
import { AdminShell } from "@/components/admin/admin-shell";
import { BRAND_NAME } from "@/lib/brand";
import { requireRole } from "@/lib/require-role";

export const metadata: Metadata = {
  title: { template: `%s · ${BRAND_NAME} admin`, default: `${BRAND_NAME} admin` },
  robots: { index: false, follow: false },
};

// Reading the session is request-time work, so it sits behind Suspense
// (cacheComponents is on). Pages and actions call requireRole() again: a layout
// is not re-rendered on every client navigation.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminRoot>
      <Suspense
        fallback={<div className="min-h-dvh" role="status" aria-label="Loading admin" />}
      >
        <Shell>{children}</Shell>
      </Suspense>
    </AdminRoot>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireRole("viewer");
  return (
    <AdminShell user={{ name: user.name, username: user.username }}>
      {children}
    </AdminShell>
  );
}
