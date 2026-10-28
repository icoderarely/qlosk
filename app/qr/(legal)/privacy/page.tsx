import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { PRIVACY } from "@/components/legal/privacy";
import { waFrom } from "@/components/landing/parts";
import { loadLandingData } from "@/lib/landing-data";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy policy | ${BRAND_NAME}`,
  description: PRIVACY.intro,
};

export default async function Page() {
  const data = await loadLandingData();
  return <LegalPage doc={PRIVACY} whatsappHref={waFrom(data.whatsappNumber, "privacy")} />;
}
