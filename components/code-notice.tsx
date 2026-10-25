import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { loadSettings } from "@/lib/load-settings";

// The page a scanned code lands on when it opens no shop: not activated yet, or
// retired. The WhatsApp contact comes from Settings, with WHATSAPP_NUMBER from the
// environment as a fallback. The Qlosk link is always there, so anyone holding a
// sticker can find the product.
export function CodeNotice({ title, children, whatsappText }: { title: string; children: ReactNode; whatsappText: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="max-w-sm">
        <h1 className="m-0 text-2xl font-extrabold text-neutral-900">{title}</h1>
        <p className="mt-3 text-neutral-700">{children}</p>
        <Suspense fallback={null}>
          <Contact text={whatsappText} />
        </Suspense>
        <p className="mt-5">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 font-bold text-neutral-900 underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <BrandMark className="size-6" />
            Visit {BRAND_NAME}
          </Link>
        </p>
      </div>
    </main>
  );
}

async function Contact({ text }: { text: string }) {
  const settings = await loadSettings();
  const digits = (settings.domain.whatsappSender || process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return (
    <p className="mt-6">
      <a
        href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`}
        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-neutral-900 px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Message us on WhatsApp
      </a>
    </p>
  );
}
