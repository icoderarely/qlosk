import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { TERMS } from "@/components/legal/terms";
import { waFrom } from "@/components/landing/parts";
import { loadLandingData } from "@/lib/landing-data";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Terms of service | ${BRAND_NAME}`,
  description: TERMS.intro,
};

export default async function Page() {
  const data = await loadLandingData();
  return <LegalPage doc={TERMS} whatsappHref={waFrom(data.whatsappNumber, "terms")} />;
}
