import type { Metadata } from "next";
import { ChangePasswordCard } from "@/components/admin/change-password-card";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { TeamAccounts } from "@/components/admin/team-accounts";
import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { requireRole } from "@/lib/require-role";
import { createTeamStore } from "@/lib/team-store";
import { hasRole } from "@/services/admin-roles";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Settings" };

// The session is request-time data, so the page body sits behind its own Suspense
// boundary: a navigation into this page can show the fallback instead of blocking.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[50dvh]" role="status" aria-label="Loading" />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireRole("viewer");
  const [settings, members] = await Promise.all([loadSettings(), createTeamStore(getDb()).list()]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Team access, defaults and how traffic is counted." />
      <TeamAccounts members={members} canManage={user.role === "owner"} />
      <SettingsForm settings={settings} canEdit={hasRole(user.role, "admin")} isOwner={user.role === "owner"} />
      <ChangePasswordCard />
    </>
  );
}
