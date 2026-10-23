import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import type { ImageStore } from "@/services/storage";

// Vercel Blob when BLOB_READ_WRITE_TOKEN is set. In development without it,
// files go to public/uploads (git-ignored) so uploads work offline. Production
// without a token fails loudly rather than losing files on a read-only disk.
export function createImageStore(): ImageStore {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    return {
      async put(key, bytes, contentType) {
        const blob = await put(key, Buffer.from(bytes), {
          access: "public",
          contentType,
          addRandomSuffix: false,
          token,
        });
        return blob.url;
      },
    };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set. See .env.example.");
  }
  return {
    async put(key, bytes) {
      const file = path.join(process.cwd(), "public", "uploads", key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
      return `/uploads/${key}`;
    },
  };
}
