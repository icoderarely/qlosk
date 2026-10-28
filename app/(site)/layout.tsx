import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope } from "next/font/google";
import { SITE_URL } from "@/lib/brand";
import "./site.css";

// qlosk.com/ and qlosk.com/mathlo. The QR product has its own root layout under /qr.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-site",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Qlosk", template: "%s | Qlosk" },
  description: "Qlosk is an independent software studio making small, useful products: Qlosk QR for local shops and Mathlo for daily brain games.",
  applicationName: "Qlosk",
  openGraph: { siteName: "Qlosk", locale: "en_IN", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0d1f1b" };

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={manrope.variable}>
      <body suppressHydrationWarning>
        {children}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="7057f90b-9144-4baf-b5d8-a6029327d7e9"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
