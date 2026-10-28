import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

// Marketing pages are open to every crawler, AI ones included. The QR redirects and customer
// shop pages are not marketing targets. /qr/admin, /qr/admin-login, /api and /qr/dev are deliberately
// not listed: robots.txt is public (it would advertise the paths) and a blocked URL can't be
// fetched, so a crawler would never see its noindex. They send X-Robots-Tag: noindex
// (next.config.ts) and admin sits behind sign-in. The old root addresses (/q/, /r/, /s/) only
// redirect, but stay listed so crawlers don't chase them.
const PRIVATE = ["/qr/q/", "/qr/r/", "/qr/s/", "/q/", "/r/", "/s/"];

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
