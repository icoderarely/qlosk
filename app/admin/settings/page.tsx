import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <PlaceholderPage title="Settings" />;
}
