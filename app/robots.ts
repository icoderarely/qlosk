import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

// Marketing pages are open to every crawler, AI ones included. Admin, the QR redirects
// and customer shop pages are not marketing targets.
const PRIVATE = ["/admin", "/admin-login", "/api/", "/q/", "/r/", "/dev/", "/s/"];

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
