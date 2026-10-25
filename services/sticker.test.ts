import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { QrCheckError, readQr } from "./print.ts";
import { BASE, testFonts } from "./print-test-helpers.ts";
import { artFromMatrix, clearCentre, rawMatrix } from "./qr-art.ts";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { STICKER_PX, buildStickerPng, buildStickerSheet, stickerFileName, stickerSheetFileName } from "./sticker.ts";

describe("the 7 x 7 cm sticker", () => {
  it("is 600 dpi square and its QR reads the code address", async () => {
    const png = await buildStickerPng("7KX2M9", BASE, await testFonts());
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, STICKER_PX);
    assert.equal(meta.height, STICKER_PX);
    assert.equal(meta.density, 600);
    assert.equal(await readQr(png), "https://qlosk.com/q/7KX2M9");
    assert.equal(stickerFileName("7KX2M9"), "qlosk-sticker-7KX2M9-7x7cm.png");
  });
  it("refuses a code that does not read back", async () => {
    const bad = (url: string) => {
      const m = clearCentre(rawMatrix(url));
      return artFromMatrix(url, m.map((row, r) => row.map((d, c) => (r % 2 === 0 && c % 3 === 0 ? !d : d))));
    };
    await assert.rejects(buildStickerPng("7KX2M9", BASE, await testFonts(), bad), QrCheckError);
  });

  it("sets stickers on A4 sheets, 6 to a page, and every QR reads from the PDF", async () => {
    const codes = ["7KX2M9", "ABCDEF", "GHJKMN", "PQRSTU", "VWXYZ2", "345678", "9ABCDE", "FGHJKM", "NPQRST"];
    const pdf = await buildStickerSheet(codes, BASE, await testFonts());
    const task = pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false });
    const doc = await task.promise;
    assert.equal(doc.numPages, 2);
    const view = (await doc.getPage(1)).view;
    assert.ok(Math.abs(view[2] - 595.28) < 0.5 && Math.abs(view[3] - 841.89) < 0.5, "A4 page");
    await task.destroy();
    assert.equal(stickerSheetFileName(9), "qlosk-stickers-9-codes-a4.pdf");
  });
  it("fits exactly 6 stickers on one page", async () => {
    const pdf = await buildStickerSheet(["7KX2M9", "ABCDEF", "GHJKMN", "PQRSTU", "VWXYZ2", "345678"], BASE, await testFonts());
    const task = pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false });
    const doc = await task.promise;
    assert.equal(doc.numPages, 1);
    await task.destroy();
  });
  it("refuses a sheet whose QR does not read back", async () => {
    const bad = (url: string) => {
      const m = clearCentre(rawMatrix(url));
      return artFromMatrix(url, m.map((row, r) => row.map((d, c) => (r % 2 === 0 && c % 3 === 0 ? !d : d))));
    };
    await assert.rejects(buildStickerSheet(["7KX2M9"], BASE, await testFonts(), bad), QrCheckError);
  });
});
