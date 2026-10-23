import sharp from "sharp";
import type { ImageKind, Reencode } from "@/services/storage";

// Re-encodes to WebP at a size that suits the page: the logo fits in 512 px,
// the cover is at most 1600 px wide. Decoding and encoding again drops EXIF
// data such as GPS position, and the EXIF rotation is applied first.
export const reencodeImage: Reencode = async (bytes, kind: ImageKind) => {
  const image = sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
  const sized =
    kind === "logo"
      ? image.resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      : image.resize({ width: 1600, withoutEnlargement: true });
  return new Uint8Array(await sized.webp({ quality: 82 }).toBuffer());
};
