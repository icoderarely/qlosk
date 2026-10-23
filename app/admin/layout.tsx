import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { BRAND_NAME } from "@/lib/brand";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500"],
});

export const metadata: Metadata = {
  title: { template: `%s · ${BRAND_NAME} admin`, default: `${BRAND_NAME} admin` },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div
      className={`${manrope.variable} ${jetbrains.variable} admin-root min-h-dvh bg-ground font-admin text-[14px] leading-[1.45] text-ink`}
    >
      {children}
    </div>
  );
}
