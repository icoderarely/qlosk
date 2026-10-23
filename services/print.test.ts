import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  BLEED_MM,
  MM,
  QUIET_MODULES,
  buildCodeSheet,
  buildShopPrint,
  printFileName,
  qrMatrix,
  qrSvg,
  qrTarget,
  sheetGrid,
  type PrintFonts,
} from "./print.ts";

const BASE = "https://shops.example.in";

async function fonts(): Promise<PrintFonts> {
  const f = (n: string) => readFile(new URL(`../assets/fonts/${n}.woff`, import.meta.url));
  return {
    regular: await f("DMSans-Regular"),
    bold: await f("DMSans-Bold"),
    indicRegular: await f("NotoSansDevanagari-Regular"),
    indicBold: await f("NotoSansDevanagari-Bold"),
  };
}

const mm = (pt: number) => pt / MM;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.05, `${a} is not ${b}`);

describe("qrTarget (the QR encodes /q/<code> only)", () => {
  it("is exactly QR_BASE_URL/q/<code>", () => {
    assert.equal(qrTarget(BASE, "7KX2M9"), "https://shops.example.in/q/7KX2M9");
  });
  it("ignores a trailing slash on the base", () => {
    assert.equal(qrTarget(`${BASE}/`, "7KX2M9"), "https://shops.example.in/q/7KX2M9");
  });
  it("never carries the shop page address", () => {
    assert.equal(qrTarget(BASE, "7KX2M9").includes("/s/"), false);
  });
  it("refuses a code that could not have been issued", () => {
    assert.throws(() => qrTarget(BASE, "0OIL11"));
    assert.throws(() => qrTarget(BASE, "ABC"));
  });
  it("refuses a base that is not a web address", () => {
    assert.throws(() => qrTarget("not a url", "7KX2M9"));
    assert.throws(() => qrTarget("javascript:alert(1)", "7KX2M9"));
  });
});

describe("QR drawing", () => {
  it("makes a square matrix", () => {
    const m = qrMatrix(qrTarget(BASE, "7KX2M9"));
    assert.ok(m.length >= 21);
    assert.ok(m.every((row) => row.length === m.length));
  });
  it("svg is vector with a 4-module quiet zone", () => {
    const m = qrMatrix(qrTarget(BASE, "7KX2M9"));
    const svg = qrSvg(qrTarget(BASE, "7KX2M9"));
    assert.ok(svg.includes(`viewBox="0 0 ${m.length + 2 * QUIET_MODULES} ${m.length + 2 * QUIET_MODULES}"`));
    assert.equal(svg.includes("<image"), false);
  });
});

describe("shop print files", () => {
  it("A5 is 148 x 210 mm with 3 mm bleed", async () => {
    const pdf = await PDFDocument.load(await buildShopPrint("a5", { name: "Velvet Salon & Spa", code: "7KX2M9" }, BASE, await fonts()));
    const page = pdf.getPage(0);
    near(mm(page.getWidth()), 148 + 2 * BLEED_MM);
    near(mm(page.getHeight()), 210 + 2 * BLEED_MM);
    const trim = page.getTrimBox();
    near(mm(trim.width), 148);
    near(mm(trim.height), 210);
    near(mm(trim.x), BLEED_MM);
  });
  it("4x6 card is 4 x 6 inches trimmed", async () => {
    const pdf = await PDFDocument.load(await buildShopPrint("card", { name: "Kaveri Sweets", code: "R4PD8T" }, BASE, await fonts()));
    const trim = pdf.getPage(0).getTrimBox();
    near(trim.width / 72, 4);
    near(trim.height / 72, 6);
  });
  it("the QR is vector paths, not an image, and the fonts are embedded", async () => {
    const bytes = Buffer.from(await buildShopPrint("a5", { name: "Kaveri Sweets", code: "R4PD8T" }, BASE, await fonts())).toString("latin1");
    assert.equal(/\/Subtype\s*\/Image/.test(bytes), false);
    assert.ok(/\/FontFile2|\/FontFile3|\/FontFile/.test(bytes));
  });
  it("a Hindi name builds with the Devanagari font", async () => {
    const out = await buildShopPrint("card", { name: "कावेरी मिठाई", code: "R4PD8T" }, BASE, await fonts());
    assert.ok(out.length > 1000);
  });
  it("a very long name still builds", async () => {
    const name = "The Extraordinarily Long Named Neighbourhood Salon and Day Spa of Old Town Market Road";
    assert.ok((await buildShopPrint("a5", { name, code: "R4PD8T" }, BASE, await fonts())).length > 1000);
  });
  it("file names carry the code", () => {
    assert.equal(printFileName("a5", "7KX2M9"), "a5-standee-7KX2M9.pdf");
    assert.equal(printFileName("svg", "7KX2M9"), "qr-7KX2M9.svg");
  });
});

describe("sheet of unassigned codes", () => {
  it("fits at least one cell of every size on its page", () => {
    assert.ok(sheetGrid("small").cols * sheetGrid("small").rows >= 6);
    assert.ok(sheetGrid("card").cols * sheetGrid("card").rows >= 1);
  });
  it("puts small stickers several to a page", async () => {
    const codes = Array.from({ length: 40 }, (_, i) => `A${String(i + 1000).padStart(5, "2")}`.slice(0, 6).replace(/[01]/g, "2"));
    const pdf = await PDFDocument.load(await buildCodeSheet("small", codes, BASE, await fonts()));
    assert.ok(pdf.getPageCount() >= 2 && pdf.getPageCount() < 40);
  });
  it("puts one A5 standee on each A4 page", async () => {
    const pdf = await PDFDocument.load(await buildCodeSheet("a5", ["7KX2M9", "R4PD8T"], BASE, await fonts()));
    assert.equal(pdf.getPageCount(), 2);
    near(mm(pdf.getPage(0).getWidth()), 210);
  });
  it("an empty stock still gives a readable page", async () => {
    const pdf = await PDFDocument.load(await buildCodeSheet("card", [], BASE, await fonts()));
    assert.equal(pdf.getPageCount(), 1);
  });
});
