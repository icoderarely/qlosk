import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Not activated yet",
  robots: { index: false, follow: false },
};

// Where an unassigned (or unpublished) QR code lands. The WhatsApp contact comes
// from Settings, with WHATSAPP_NUMBER from the environment as a fallback.
export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="max-w-sm">
        <h1 className="m-0 text-2xl font-extrabold text-neutral-900">This QR code is not activated yet</h1>
        <p className="mt-3 text-neutral-700">
          The shop&apos;s page is being set up. Please check again soon.
        </p>
        <Suspense fallback={null}>
          <Contact />
        </Suspense>
      </div>
    </main>
  );
}

async function Contact() {
  const settings = await getSettings();
  const digits = (settings.domain.whatsappSender || process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const text = encodeURIComponent("Hi, I scanned a QR code that is not activated yet.");
  return (
    <p className="mt-6">
      <a
        href={`https://wa.me/${digits}?text=${text}`}
        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-neutral-900 px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Message us on WhatsApp
      </a>
    </p>
  );
}
