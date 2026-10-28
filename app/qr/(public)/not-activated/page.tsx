import type { Metadata } from "next";
import { CodeNotice } from "@/components/code-notice";

export const metadata: Metadata = {
  title: "Not activated yet",
  robots: { index: false, follow: false },
};

// Where an unassigned (or unpublished) QR code lands.
export default function Page() {
  return (
    <CodeNotice title="This QR code is not activated yet" whatsappText="Hi, I scanned a QR code that is not activated yet.">
      The shop&apos;s page is being set up. Please check again soon.
    </CodeNotice>
  );
}
