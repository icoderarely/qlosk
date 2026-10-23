import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireRole } from "@/lib/require-role";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  await requireRole("viewer");
  return <SettingsForm settings={await getSettings()} />;
}
