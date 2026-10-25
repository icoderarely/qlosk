// Generating a download and keeping it (spec sections 4 and 8): build the file
// (services/print.ts decodes the QR from a rendering first and throws if it does
// not read back), save it to storage, write one row to print_files, then hand
// the bytes back. A file whose QR fails the check is never saved or returned.
// No Next.js imports.
import { randomBytes } from "node:crypto";
import type { StandeeChoices } from "../components/standee/types.ts";
import {
  type PrintFonts,
  type StickerSize,
  buildCodeSheet,
  buildStandeePdf,
  buildStandeePng,
  standeeFileName,
} from "./print.ts";
import { buildQrArt, qrTarget, type QrArt } from "./qr-art.ts";
import { buildStickerSheet, stickerSheetFileName } from "./sticker.ts";
import { hasRole, type Role } from "./admin-roles.ts";
import type { EditorValues } from "./shop-editor.ts";
import { standeeInput } from "./standee.ts";

export type PrintFileRow = {
  shopId: string | null;
  kind: "pdf" | "png" | "sheet";
  design: string | null;
  theme: string | null;
  size: string;
  createdBy: string;
  fileUrl: string;
};

export type PrintFileLog = { insert(row: PrintFileRow): Promise<void> };
export type FileStorage = { put(key: string, bytes: Uint8Array, contentType: string): Promise<string> };

export type PrintDeps = {
  fonts: PrintFonts;
  storage: FileStorage;
  log: PrintFileLog;
  /** Makes the QR for an address. Tests swap it to print a damaged code. */
  makeArt?: (url: string) => QrArt;
};

export type Download = { bytes: Uint8Array; fileName: string; contentType: string; fileUrl: string };

/** Print files carry a shop's name and QR, and each one is logged; viewers cannot make them. */
export function canDownloadPrintFiles(role: Role): boolean {
  return hasRole(role, "admin");
}

const key = (folder: string, ext: string) => `print/${folder}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

export async function downloadStandee(
  deps: PrintDeps,
  args: {
    kind: "pdf" | "png";
    shop: { id: string; code: string; values: EditorValues };
    choices: StandeeChoices;
    baseUrl: string;
    userEmail: string;
    logoSrc?: string | null;
  },
): Promise<Download> {
  const { kind, shop, choices } = args;
  const art = (deps.makeArt ?? buildQrArt)(qrTarget(args.baseUrl, shop.code));
  const input = standeeInput(shop.values, choices, art, args.logoSrc);
  const title = `${input.content.shopName} standee`;
  const bytes = kind === "pdf" ? await buildStandeePdf(input, deps.fonts, title) : await buildStandeePng(input, deps.fonts);
  const contentType = kind === "pdf" ? "application/pdf" : "image/png";
  const fileUrl = await deps.storage.put(key(shop.id, kind), bytes, contentType);
  await deps.log.insert({
    shopId: shop.id,
    kind,
    design: input.design,
    theme: input.theme,
    size: input.size,
    createdBy: args.userEmail,
    fileUrl,
  });
  return { bytes, fileName: standeeFileName(kind, shop.code, input), contentType, fileUrl };
}

export async function downloadCodeSheet(
  deps: PrintDeps,
  args: { size: StickerSize; codes: string[]; baseUrl: string; userEmail: string },
): Promise<Download> {
  const bytes = await buildCodeSheet(args.size, args.codes, args.baseUrl, deps.fonts, deps.makeArt);
  const fileUrl = await deps.storage.put(key("sheets", "pdf"), bytes, "application/pdf");
  await deps.log.insert({ shopId: null, kind: "sheet", design: null, theme: null, size: args.size, createdBy: args.userEmail, fileUrl });
  return { bytes, fileName: `unassigned-codes-${args.size}.pdf`, contentType: "application/pdf", fileUrl };
}

/** A4 sheet of 7 x 7 cm stickers for the chosen codes, in the order given (services/sticker.ts). */
export async function downloadStickerSheet(
  deps: PrintDeps,
  args: { codes: string[]; baseUrl: string; userEmail: string },
): Promise<Download> {
  const bytes = await buildStickerSheet(args.codes, args.baseUrl, deps.fonts, deps.makeArt);
  const fileUrl = await deps.storage.put(key("stickers", "pdf"), bytes, "application/pdf");
  await deps.log.insert({ shopId: null, kind: "sheet", design: "sticker", theme: null, size: "A4x6", createdBy: args.userEmail, fileUrl });
  return { bytes, fileName: stickerSheetFileName(args.codes.length), contentType: "application/pdf", fileUrl };
}
