// The QR product lives under /qr; qlosk.com/ and /mathlo belong to other pages.
// No Next.js imports: next.config.ts reads this file, and the tests do too.
export const QR_PREFIX = "/qr";

// Addresses from before the move. A printed QR sticker still opens /q/<code> and old shop
// links still open /s/<slug>, so these stay permanent redirects for good (spec section 3).
// Each source is a Next.js redirect pattern; destinations keep the same parameters.
// `:path*` also matches nothing, so "/admin/:path*" covers "/admin" too.
export const LEGACY_REDIRECTS: ReadonlyArray<{ source: string; destination: string }> = [
  { source: "/q/:code", destination: `${QR_PREFIX}/q/:code` },
  { source: "/r/:code/:linkId", destination: `${QR_PREFIX}/r/:code/:linkId` },
  { source: "/s/:slug", destination: `${QR_PREFIX}/s/:slug` },
  { source: "/s/:slug/og", destination: `${QR_PREFIX}/s/:slug/og` },
  { source: "/playground", destination: `${QR_PREFIX}/playground` },
  { source: "/privacy", destination: `${QR_PREFIX}/privacy` },
  { source: "/terms", destination: `${QR_PREFIX}/terms` },
  { source: "/refunds", destination: `${QR_PREFIX}/refunds` },
  { source: "/not-activated", destination: `${QR_PREFIX}/not-activated` },
  { source: "/code-retired", destination: `${QR_PREFIX}/code-retired` },
  { source: "/admin-login", destination: `${QR_PREFIX}/admin-login` },
  { source: "/admin/:path*", destination: `${QR_PREFIX}/admin/:path*` },
];
