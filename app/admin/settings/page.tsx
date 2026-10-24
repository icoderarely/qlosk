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

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
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
