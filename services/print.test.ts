import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { STANDEE_DESIGNS, STANDEE_LIGHT_THEMES, type StandeeDesign, type StandeeLightTheme } from "../components/standee/types.ts";
import {
  BLEED_MM,
  MM,
  PNG_WIDTH,
  QrCheckError,
  type StandeeInput,
  buildCodeSheet,
  buildStandeePdf,
  buildStandeePng,
  checkStandeeQr,
  parseStickerSize,
  readPdfQr,
  readQr,
  sheetGrid,
} from "./print.ts";
import { BASE, testFonts, testShop } from "./print-test-helpers.ts";
import { artFromMatrix, buildQrArt, clearCentre, qrTarget, rawMatrix, type QrArt } from "./qr-art.ts";
import { standeeInput } from "./standee.ts";

const mm = (pt: number) => pt / MM;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.05, `${a} is not ${b}`);

const CODE = "7KX2M9";
const URL_FOR_CODE = qrTarget(BASE, CODE);

function input(over: Partial<StandeeInput> = {}, art: QrArt = buildQrArt(URL_FOR_CODE)): StandeeInput {
  const base = standeeInput(testShop(), { design: "arch", theme: "blush", headline: "", size: "A5" }, art);
  return { ...base, ...over };
}

/** Flips most data modules, far beyond what error correction H can repair. */
function corrupted(url: string): QrArt {
  const m = clearCentre(rawMatrix(url));
  const n = m.length;
  let seed = 12345;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const finder = (r: number, c: number) => (r < 9 && c < 9) || (r < 9 && c >= n - 8) || (r >= n - 8 && c < 9);
  return artFromMatrix(url, m.map((row, r) => row.map((dark, c) => (finder(r, c) || r === 6 || c === 6 || rand() > 0.5 ? dark : !dark))));
}

describe("standee PDF", () => {
  it("A5 is 148 x 210 mm with 3 mm bleed on every side", async () => {
    const pdf = await PDFDocument.load(await buildStandeePdf(input(), await testFonts()));
    assert.equal(pdf.getPageCount(), 1);
    const page = pdf.getPage(0);
    near(mm(page.getWidth()), 148 + 2 * BLEED_MM);
    near(mm(page.getHeight()), 210 + 2 * BLEED_MM);
    const trim = page.getTrimBox();
    near(mm(trim.width), 148);
    near(mm(trim.height), 210);
    near(mm(trim.x), BLEED_MM);
    near(mm(trim.y), BLEED_MM);
    near(mm(page.getBleedBox().width), 148 + 2 * BLEED_MM);
  });
  it("A4 is 210 x 297 mm with 3 mm bleed", async () => {
    const pdf = await PDFDocument.load(await buildStandeePdf(input({ size: "A4" }), await testFonts()));
    const page = pdf.getPage(0);
    near(mm(page.getWidth()), 210 + 2 * BLEED_MM);
    near(mm(page.getHeight()), 297 + 2 * BLEED_MM);
    near(mm(page.getTrimBox().height), 297);
  });
  it("the QR is vector paths, not an image, and the fonts are embedded", async () => {
    const bytes = Buffer.from(await buildStandeePdf(input(), await testFonts())).toString("latin1");
    assert.equal(/\/Subtype\s*\/Image/.test(bytes), false);
    assert.ok(/\/FontFile2/.test(bytes));
    assert.ok(/\/BaseFont\s*\/[A-Z]{6}\+/.test(bytes), "subset font names");
    assert.equal(/\/BaseFont\s*\/Helvetica/.test(bytes), false, "no standard font stands in");
  });
  it("embeds the fonts of the shop's font pack", async () => {
    for (const [font, name] of [["editorial", /Fraunces/], ["clean", /DMSans|DM-?Sans/i], ["rounded", /Nunito/]] as const) {
      const shop = testShop({}, font);
      const inp = standeeInput(shop, { design: "ticket", theme: "daylight", headline: "", size: "A5" }, buildQrArt(URL_FOR_CODE));
      const bytes = Buffer.from(await buildStandeePdf(inp, await testFonts())).toString("latin1");
      assert.ok(name.test(bytes), `${font} font is in the PDF`);
      assert.ok(/Manrope/.test(bytes), "the credit line font is in the PDF");
    }
  });
  it("builds every design in every light theme and both sizes", async () => {
    for (const design of STANDEE_DESIGNS) {
      for (const theme of STANDEE_LIGHT_THEMES) {
        for (const size of ["A5", "A4"] as const) {
          const out = await buildStandeePdf(input({ design, theme, size }), await testFonts());
          assert.ok(out.length > 5000, `${design} ${theme} ${size}`);
        }
      }
    }
  });
  it("a long name and a Hindi name still build", async () => {
    const long = "The Extraordinarily Long Named Neighbourhood Salon and Day Spa of Old Town Market Road";
    for (const name of [long, "कावेरी मिठाई"]) {
      const shop = testShop({ name, tagline: name });
      for (const design of STANDEE_DESIGNS) {
        const inp = standeeInput(shop, { design, theme: "blush", headline: "A headline that is as long as allowed here", size: "A5" }, buildQrArt(URL_FOR_CODE));
        assert.ok((await buildStandeePdf(inp, await testFonts())).length > 5000, `${design} ${name.slice(0, 10)}`);
      }
    }
  });
});

describe("standee PNG", () => {
  it("is 1080 px wide", async () => {
    const png = await buildStandeePng(input(), await testFonts());
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, PNG_WIDTH);
    assert.equal(meta.format, "png");
    near(meta.height! / meta.width!, 210 / 148 - 0.0);
  });
});

describe("the QR reads back (done when a printed copy scans)", () => {
  for (const design of STANDEE_DESIGNS) {
    for (const theme of STANDEE_LIGHT_THEMES) {
      it(`${design} in ${theme}: the PNG reads exactly QR_BASE_URL/q/<code>, at full size and at 45%`, async () => {
        const png = await buildStandeePng(input({ design: design as StandeeDesign, theme: theme as StandeeLightTheme }), await testFonts());
        assert.equal(await readQr(png), URL_FOR_CODE);
        const small = await sharp(png).resize({ width: Math.round(PNG_WIDTH * 0.45) }).png().toBuffer();
        assert.equal(await readQr(small), URL_FOR_CODE);
      });
    }
  }
  for (const design of STANDEE_DESIGNS) {
    it(`${design}: the PDF itself, drawn by a PDF renderer, reads exactly QR_BASE_URL/q/<code> at full size and at 45%`, async () => {
      for (const theme of STANDEE_LIGHT_THEMES) {
        const pdf = await buildStandeePdf(input({ design: design as StandeeDesign, theme: theme as StandeeLightTheme }), await testFonts());
        assert.equal(await readPdfQr(pdf), URL_FOR_CODE, theme);
        // About 45% of full size is 30 mm for the code. jsQR is fussy about where pixels fall,
        // so ask at three nearby sizes and want most of them to read.
        const reads = await Promise.all([1.2, 1.35, 1.5].map((scale) => readPdfQr(pdf, 1, scale)));
        assert.ok(reads.filter((r) => r === URL_FOR_CODE).length >= 2, `${theme} at about 45%: ${reads}`);
      }
    });
  }
  it("also with a longer address and with a logo", async () => {
    const url = qrTarget("https://stickers.example.co.in", "R4PD8T");
    const png = await buildStandeePng(input({}, buildQrArt(url)), await testFonts());
    assert.equal(await readQr(png), url);
    const logo = await sharp({ create: { width: 200, height: 120, channels: 4, background: "#9F1D45" } }).png().toBuffer();
    const withLogo = input();
    withLogo.content = { ...withLogo.content, logoSrc: `data:image/png;base64,${logo.toString("base64")}` };
    assert.equal(await readQr(await buildStandeePng(withLogo, await testFonts())), URL_FOR_CODE);
  });
  it("the check passes for a good standee", async () => {
    await checkStandeeQr(input(), await testFonts());
  });
});

describe("a QR that does not read back fails loudly", () => {
  it("a corrupted code makes the PNG fail", async () => {
    await assert.rejects(buildStandeePng(input({}, corrupted(URL_FOR_CODE)), await testFonts()), QrCheckError);
  });
  it("a corrupted code makes the PDF fail", async () => {
    await assert.rejects(buildStandeePdf(input({}, corrupted(URL_FOR_CODE)), await testFonts()), QrCheckError);
  });
  it("a code that reads a different address fails, even though it scans", async () => {
    const other = buildQrArt(qrTarget(BASE, "R4PD8T"));
    const lying = { ...other, url: URL_FOR_CODE }; // claims to be 7KX2M9
    await assert.rejects(buildStandeePng(input({}, lying), await testFonts()), /reads https:\/\/qlosk.com\/q\/R4PD8T instead of/);
  });
});

describe("sheet of unassigned codes", () => {
  const CODES = ["7KX2M9", "R4PD8T", "M2HC6W", "H8WQ5Z", "J9NV3B", "W5RF4A", "T7QK2D", "Y3BN8H", "A2B3C4", "D5E6F7", "G8H9J2", "K3M4N5", "P6Q7R8"];
  it("fits at least one cell of every size on its page", () => {
    assert.ok(sheetGrid("small").cols * sheetGrid("small").rows >= 6);
    assert.ok(sheetGrid("card").cols * sheetGrid("card").rows >= 1);
  });
  it("puts small stickers several to a page", async () => {
    const pdf = await PDFDocument.load(await buildCodeSheet("small", CODES, BASE, await testFonts()));
    assert.ok(pdf.getPageCount() >= 1 && pdf.getPageCount() < CODES.length);
  });
  it("puts one A5 standee on each A4 page", async () => {
    const pdf = await PDFDocument.load(await buildCodeSheet("a5", ["7KX2M9", "R4PD8T"], BASE, await testFonts()));
    assert.equal(pdf.getPageCount(), 2);
    near(mm(pdf.getPage(0).getWidth()), 210);
    near(mm(pdf.getPage(0).getHeight()), 297);
  });
  it("is vector with embedded fonts, and codes use the same QR rules", async () => {
    const bytes = Buffer.from(await buildCodeSheet("card", CODES.slice(0, 2), BASE, await testFonts())).toString("latin1");
    assert.equal(/\/Subtype\s*\/Image/.test(bytes), false);
    assert.ok(/\/FontFile2/.test(bytes));
  });
  it("an empty stock still gives a readable page", async () => {
    const pdf = await PDFDocument.load(await buildCodeSheet("card", [], BASE, await testFonts()));
    assert.equal(pdf.getPageCount(), 1);
  });
  it("a damaged code stops the whole sheet", async () => {
    await assert.rejects(
      buildCodeSheet("small", CODES.slice(0, 3), BASE, await testFonts(), (url) => (url.endsWith("R4PD8T") ? corrupted(url) : buildQrArt(url))),
      /sheet cell for R4PD8T/,
    );
  });
  it("an unknown size falls back to the 4x6 card", () => {
    assert.equal(parseStickerSize("huge"), "card");
    assert.equal(parseStickerSize("a5"), "a5");
  });
});
