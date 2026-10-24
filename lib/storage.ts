import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import type { FileStorage } from "@/services/print-files";
import type { ImageStore } from "@/services/storage";

// Cloudinary when CLOUDINARY_URL is set (the SDK reads it from the environment).
// In development without it, files go to public/uploads (git-ignored) so uploads
// work offline. Production without it fails loudly rather than losing files on a
// read-only disk.
export function createImageStore(): ImageStore {
  if (process.env.CLOUDINARY_URL) {
    return {
      async put(key, bytes) {
        const publicId = key.replace(/\.[^./]+$/, "");
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { public_id: publicId, resource_type: "image", overwrite: false, secure: true },
              (error, uploaded) => (uploaded ? resolve(uploaded) : reject(error ?? new Error("Upload failed."))),
            )
            .end(Buffer.from(bytes));
        });
        return result.secure_url;
      },
    };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("CLOUDINARY_URL is not set. See .env.example.");
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

// Generated print files (PDF and PNG). Same rules as images: Cloudinary when
// CLOUDINARY_URL is set (PDFs go up as raw files), public/uploads in development,
// and a loud failure in production without it. Saving is part of a download, so
// a failure here fails the download.
export function createFileStorage(): FileStorage {
  if (process.env.CLOUDINARY_URL) {
    return {
      async put(key, bytes, contentType) {
        const image = contentType.startsWith("image/");
        // Raw files keep their extension in the public id; images get it from the format.
        const publicId = image ? key.replace(/\.[^./]+$/, "") : key;
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { public_id: publicId, resource_type: image ? "image" : "raw", overwrite: false, secure: true },
              (error, uploaded) => (uploaded ? resolve(uploaded) : reject(error ?? new Error("Upload failed."))),
            )
            .end(Buffer.from(bytes));
        });
        return result.secure_url;
      },
    };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("CLOUDINARY_URL is not set. See .env.example.");
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
