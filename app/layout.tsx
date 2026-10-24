import type { Metadata } from "next";
import Script from "next/script";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND_NAME, template: `%s | ${BRAND_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: BRAND_NAME,
  openGraph: { siteName: BRAND_NAME, locale: "en_IN", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body suppressHydrationWarning>{children}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="7057f90b-9144-4baf-b5d8-a6029327d7e9"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
