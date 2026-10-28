import { loadLandingData } from "@/lib/landing-data";
import { waFrom } from "@/components/landing/parts";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { Footer } from "@/components/landing/footer";
import "@/components/landing/landing.css";
import "@/components/legal/legal.css";

export default async function LegalLayout({ children }: LayoutProps<"/qr">) {
  const data = await loadLandingData();
  return (
    <div className={`l-root ${LANDING_FONTS}`}>
      {children}
      <Footer whatsappHref={waFrom(data.whatsappNumber, "footer")} />
    </div>
  );
}
