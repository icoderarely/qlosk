import type { Metadata } from "next";
import { CodeNotice } from "@/components/code-notice";

export const metadata: Metadata = {
  title: "QR code no longer in use",
  robots: { index: false, follow: false },
};

// Where a retired QR code lands (spec section 3). A retired code is never reused.
export default function Page() {
  return (
    <CodeNotice title="This QR code is no longer in use" whatsappText="Hi, I scanned a QR code that is no longer in use.">
      It has been retired and no longer opens a shop page.
    </CodeNotice>
  );
}
