import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // The print routes read fonts from disk; make sure they ship with the function.
  // The PDF check draws the PDF with pdf.js, which loads its worker file by path.
  outputFileTracingIncludes: {
    "/admin/print/**": ["./assets/fonts/**", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/admin/shops/[id]/standee.pdf": ["./assets/fonts/**", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/admin/shops/[id]/standee.png": ["./assets/fonts/**"],
    "/admin/shops/[id]": ["./assets/fonts/**"], // the editor's QR check runs here
  },
  // Native or file-reading packages the standee downloads use: load them from node_modules.
  serverExternalPackages: ["@resvg/resvg-js", "@napi-rs/canvas", "pdfkit", "svg-to-pdfkit", "pdfjs-dist"],
  partialPrefetching: true,
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
