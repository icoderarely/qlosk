import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_CHOICES } from "../components/standee/types.ts";
import { QrCheckError, readPdfQr, readQr } from "./print.ts";
import { type PrintFileRow, type PrintDeps, canDownloadPrintFiles, downloadCodeSheet, downloadStandee, downloadStickerSheet } from "./print-files.ts";
import { BASE, testFonts, testShop } from "./print-test-helpers.ts";
import { artFromMatrix, clearCentre, rawMatrix } from "./qr-art.ts";

async function deps(over: Partial<PrintDeps> = {}) {
  const saved: { key: string; bytes: Uint8Array; type: string }[] = [];
  const rows: PrintFileRow[] = [];
  const all: PrintDeps = {
    fonts: await testFonts(),
    storage: { async put(key, bytes, type) { saved.push({ key, bytes, type }); return `https://files.example/${key}`; } },
    log: { async insert(row) { rows.push(row); } },
    ...over,
  };
  return { all, saved, rows };
}

const shop = { id: "11111111-1111-4111-8111-111111111111", code: "7KX2M9", values: testShop() };
const args = { shop, choices: { ...DEFAULT_CHOICES, design: "badge" as const, theme: "marigold" as const }, baseUrl: BASE, userEmail: "admin@qlosk.com" };

/** A code damaged past what error correction can repair. */
function damaged(url: string) {
  const m = clearCentre(rawMatrix(url));
  const n = m.length;
  return artFromMatrix(url, m.map((row, r) => row.map((d, c) => (r < 9 && c < 9) || (r < 9 && c >= n - 8) || (r >= n - 8 && c < 9) || r === 6 || c === 6 ? d : (r * 7 + c * 13) % 3 === 0 ? !d : d)));
}

describe("downloading a standee", () => {
  it("saves the PDF, logs it and returns the same bytes", async () => {
    const { all, saved, rows } = await deps();
    const file = await downloadStandee(all, { ...args, kind: "pdf" });
    assert.equal(file.contentType, "application/pdf");
    assert.equal(file.fileName, "standee-badge-a5-7KX2M9.pdf");
    assert.equal(saved.length, 1);
    assert.deepEqual(saved[0].bytes, file.bytes);
    assert.match(saved[0].key, /^print\/1111.*\.pdf$/);
    assert.equal(await readPdfQr(file.bytes), "https://qlosk.com/q/7KX2M9");
    assert.equal(rows.length, 1);
    assert.deepEqual({ ...rows[0], fileUrl: "" }, {
      shopId: shop.id, kind: "pdf", design: "badge", theme: "marigold", size: "A5", createdBy: "admin@qlosk.com", fileUrl: "",
    });
    assert.equal(rows[0].fileUrl, file.fileUrl);
  });
  it("saves the PNG and logs it", async () => {
    const { all, saved, rows } = await deps();
    const file = await downloadStandee(all, { ...args, kind: "png", choices: { ...args.choices, size: "A4", theme: "match" } });
    assert.equal(file.contentType, "image/png");
    assert.equal(await readQr(file.bytes), "https://qlosk.com/q/7KX2M9");
    assert.equal(saved[0].type, "image/png");
    assert.equal(rows[0].kind, "png");
    assert.equal(rows[0].size, "A4");
    assert.equal(rows[0].theme, "blush", "match shows the shop page theme");
  });
  it("encodes only QR_BASE_URL/q/<code>", async () => {
    const { all } = await deps();
    const file = await downloadStandee(all, { ...args, kind: "png", baseUrl: "https://shops.example.in/" });
    assert.equal(await readQr(file.bytes), "https://shops.example.in/q/7KX2M9");
  });
  for (const kind of ["pdf", "png"] as const) {
    it(`a corrupted QR makes the ${kind} download fail, and nothing is saved or logged`, async () => {
      const { all, saved, rows } = await deps({ makeArt: damaged });
      await assert.rejects(downloadStandee(all, { ...args, kind }), QrCheckError);
      assert.equal(saved.length, 0);
      assert.equal(rows.length, 0);
    });
  }
  it("a storage failure fails the download and logs nothing", async () => {
    const { all, rows } = await deps({ storage: { put: async () => { throw new Error("disk full"); } } });
    await assert.rejects(downloadStandee(all, { ...args, kind: "png" }), /disk full/);
    assert.equal(rows.length, 0);
  });
});

describe("downloading the sheet of unassigned codes", () => {
  it("saves it and logs a sheet row with no shop", async () => {
    const { all, saved, rows } = await deps();
    const file = await downloadCodeSheet(all, { size: "small", codes: ["7KX2M9", "R4PD8T"], baseUrl: BASE, userEmail: "admin@qlosk.com" });
    assert.equal(file.fileName, "unassigned-codes-small.pdf");
    assert.equal(saved.length, 1);
    assert.deepEqual(rows[0], { shopId: null, kind: "sheet", design: null, theme: null, size: "small", createdBy: "admin@qlosk.com", fileUrl: file.fileUrl });
  });
  it("a damaged code stops it before anything is saved", async () => {
    const { all, saved, rows } = await deps({ makeArt: damaged });
    await assert.rejects(downloadCodeSheet(all, { size: "card", codes: ["7KX2M9"], baseUrl: BASE, userEmail: "a@b.in" }), QrCheckError);
    assert.equal(saved.length + rows.length, 0);
  });
});

describe("downloading a sticker sheet", () => {
  it("saves it and logs one sheet row with no shop", async () => {
    const { all, saved, rows } = await deps();
    const file = await downloadStickerSheet(all, { codes: ["7KX2M9", "R4PD8T"], baseUrl: BASE, userEmail: "admin@qlosk.com" });
    assert.equal(file.fileName, "qlosk-stickers-2-codes-a4.pdf");
    assert.equal(saved.length, 1);
    assert.deepEqual(rows, [{ shopId: null, kind: "sheet", design: "sticker", theme: null, size: "A4x8", createdBy: "admin@qlosk.com", fileUrl: file.fileUrl }]);
  });
  it("a damaged code stops it before anything is saved", async () => {
    const { all, saved, rows } = await deps({ makeArt: damaged });
    await assert.rejects(downloadStickerSheet(all, { codes: ["7KX2M9"], baseUrl: BASE, userEmail: "a@b.in" }), QrCheckError);
    assert.equal(saved.length + rows.length, 0);
  });
});

describe("who may download", () => {
  it("admins and owners can; viewers cannot", () => {
    assert.equal(canDownloadPrintFiles("owner"), true);
    assert.equal(canDownloadPrintFiles("admin"), true);
    assert.equal(canDownloadPrintFiles("viewer"), false);
  });
});
