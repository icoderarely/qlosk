import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache, Suspense } from "react";
import { ShopPage } from "@/components/shop-page/shop-page";
import { getDb } from "@/lib/db";
import { createPublicStore } from "@/lib/public-page-store";
import { trackingKeys } from "@/lib/tracking-env";
import { lookupPublicPage, withTapLinks } from "@/services/public-page";
import { signTapToken } from "@/services/tracking";

// One lookup per request, shared by the page and its metadata.
const lookup = cache((slug: string) => lookupPublicPage(createPublicStore(getDb()), slug));

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const result = await lookup((await params).slug);
  if (result.kind !== "page") return { title: "Page not found", robots: { index: false } };
  return { title: result.title, description: result.description };
}

// Server-rendered. The database read is request-time work, so it sits behind
// Suspense (cacheComponents is on). Old addresses are redirected with a real
// 301 in proxy.ts before this runs; the redirect here is the fallback.
export default function Page({ params }: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neutral-50" role="status" aria-label="Loading" />}>
      <Shop params={params} />
    </Suspense>
  );
}

async function Shop({ params }: { params: PageProps<"/s/[slug]">["params"] }) {
  const result = await lookup((await params).slug);
  if (result.kind === "redirect") permanentRedirect(`/s/${result.slug}`);
  if (result.kind === "notfound") notFound();
  // Made per request, after the data read, so the time is request time.
  const { tokenKey } = trackingKeys();
  const now = new Date();
  const props = withTapLinks(result.props, result.code, (code, linkId) => signTapToken(tokenKey, code, linkId, now));
  return <ShopPage {...props} />;
}
