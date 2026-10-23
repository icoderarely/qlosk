import { BRAND_NAME } from "@/lib/brand";

// Holding page. The landing page is the last slice in docs/spec.md.
export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">{BRAND_NAME}</h1>
    </main>
  );
}
