import type { Metadata } from "next";
import { OnboardingBoard } from "@/components/admin/onboarding-board";
import { getDb } from "@/lib/db";
import { createOnboardingStore } from "@/lib/onboarding-store";
import { requireRole } from "@/lib/require-role";
import { hasRole } from "@/services/admin-roles";
import { getOnboarding } from "@/services/onboarding";

export const metadata: Metadata = { title: "Onboarding" };

export default async function Page() {
  const user = await requireRole("viewer");
  const data = await getOnboarding(createOnboardingStore(getDb()));
  return <OnboardingBoard data={data} canEdit={hasRole(user.role, "admin")} />;
}
