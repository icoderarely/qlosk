import type { Metadata } from "next";
import { AdminRoot } from "@/components/admin/admin-root";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Sign in · ${BRAND_NAME} admin`,
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: LayoutProps<"/admin-login">) {
  return <AdminRoot>{children}</AdminRoot>;
}
