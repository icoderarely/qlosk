// QR code stock reads for the admin. Fake data for now (see services/shops.ts).
import {
  QR_CODES,
  QR_COUNTS,
  STICKER_SIZES,
  type MockQrCode,
} from "../lib/mock/qr.ts";

export type QrCodeRow = MockQrCode;

export type QrOverview = {
  counts: typeof QR_COUNTS;
  codes: QrCodeRow[];
  stickerSizes: readonly string[];
};

export async function getQrOverview(): Promise<QrOverview> {
  return {
    counts: { ...QR_COUNTS },
    codes: QR_CODES.map((c) => ({ ...c })),
    stickerSizes: STICKER_SIZES,
  };
}
