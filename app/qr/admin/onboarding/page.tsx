import type { Metadata } from "next";
import { OnboardingBoard } from "@/components/admin/onboarding-board";
import { getDb } from "@/lib/db";
import { createOnboardingStore } from "@/lib/onboarding-store";
import { requireRole } from "@/lib/require-role";
import { hasRole } from "@/services/admin-roles";
import { getOnboarding } from "@/services/onboarding";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Onboarding" };

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
  const data = await getOnboarding(createOnboardingStore(getDb()));
  return <OnboardingBoard data={data} canEdit={hasRole(user.role, "admin")} />;
}
