import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/admin/placeholder-page";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <PlaceholderPage title="Overview" />;
}
