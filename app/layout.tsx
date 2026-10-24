import type { Metadata } from "next";
import Script from "next/script";
import { BRAND_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND_NAME,
  applicationName: BRAND_NAME,
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
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
