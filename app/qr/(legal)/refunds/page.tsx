import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { REFUNDS } from "@/components/legal/refunds";
import { waFrom } from "@/components/landing/parts";
import { loadLandingData } from "@/lib/landing-data";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Refund and cancellation policy | ${BRAND_NAME}`,
  description: REFUNDS.intro,
};

export default async function Page() {
  const data = await loadLandingData();
  return <LegalPage doc={REFUNDS} whatsappHref={waFrom(data.whatsappNumber, "refunds")} />;
}
