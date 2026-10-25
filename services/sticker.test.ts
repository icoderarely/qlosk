import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { QrCheckError, readQr } from "./print.ts";
import { BASE, testFonts } from "./print-test-helpers.ts";
import { artFromMatrix, clearCentre, rawMatrix } from "./qr-art.ts";
import { STICKER_PX, buildStickerPng, stickerFileName } from "./sticker.ts";

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
});
