import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./lib/routes.ts";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // The print routes read fonts from disk; make sure they ship with the function.
  // The PDF check draws the PDF with pdf.js, which loads its worker file by path.
  outputFileTracingIncludes: {
    "/qr/admin/print/**": ["./assets/fonts/**", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/qr/admin/shops/[id]/standee.pdf": ["./assets/fonts/**", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/qr/admin/shops/[id]/standee.png": ["./assets/fonts/**"],
    "/qr/admin/shops/[id]": ["./assets/fonts/**"], // the editor's QR check runs here
    "/qr/s/[slug]/og": ["./assets/fonts/**"], // the link-preview card
    "/qr/dev/share-card/image": ["./assets/fonts/**"],
    "/qr/opengraph-image": ["./assets/fonts/**"], // the site-wide card
  },
  // Native or file-reading packages the standee downloads use: load them from node_modules.
  serverExternalPackages: ["@resvg/resvg-js", "@napi-rs/canvas", "pdfkit", "svg-to-pdfkit", "pdfjs-dist"],
  partialPrefetching: true,
  // Admin, sign-in and internal routes must never be indexed, whatever a page's own metadata says.
  // The header also covers redirects, downloads (PDF/PNG) and route handlers, which have no <meta>.
  async headers() {
    return [
      {
        source: "/:path(api)/:rest*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" }],
      },
      {
        source: "/qr/:path(admin|admin-login|dev)/:rest*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" }],
      },
      {
        source: "/qr/:path(admin|admin-login)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" }],
      },
    ];
  },
  // The QR product moved from the site root to /qr. Printed QR stickers still open /q/<code>,
  // so every old address stays a permanent redirect (list and reasons in lib/routes.ts).
  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({ ...r, permanent: true }));
  },
  // Mathlo (the brain-training app) keeps its legal pages as static files in public/mathlo/.
  // These serve them at clean URLs: /mathlo/privacy, /mathlo/terms, /mathlo/delete-account, /mathlo/support.
  async rewrites() {
    return [
      {
        source: "/mathlo/:page(privacy|terms|delete-account|support)",
        destination: "/mathlo/:page.html",
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
