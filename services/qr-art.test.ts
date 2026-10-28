import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  QR_CLEAR,
  QR_INK,
  QR_MARK,
  buildQrArt,
  clearCentre,
  qrArtSvg,
  qrSvg,
  qrTarget,
  rawMatrix,
} from "./qr-art.ts";

const BASE = "https://shops.example.in";

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
  it("keeps a path on the base, so the QR product's address under /qr works", () => {
    const target = qrTarget("https://qlosk.com/qr", "7KX2M9");
    assert.equal(target, "https://qlosk.com/qr/q/7KX2M9");
    assert.ok(rawMatrix(target).length <= 41, "still fits the standee's QR size");
  });
  it("refuses a code that could not have been issued", () => {
    assert.throws(() => qrTarget(BASE, "0OIL11"));
    assert.throws(() => qrTarget(BASE, "ABC"));
  });
  it("refuses a base that is not a web address", () => {
    assert.throws(() => qrTarget("not a url", "7KX2M9"));
    assert.throws(() => qrTarget("javascript:alert(1)", "7KX2M9"));
  });
  it("the art carries that address and nothing else", () => {
    assert.equal(buildQrArt(qrTarget(BASE, "7KX2M9")).url, "https://shops.example.in/q/7KX2M9");
  });
});

// qrcode-generator numbers the levels M 0, L 1, H 2, Q 3. The format bits sit around
// the top-left finder square and are XORed with 0x5412.
function errorCorrectionLevel(m: boolean[][]): number {
  const n = m.length;
  let bits = 0;
  for (let i = 0; i < 15; i++) {
    const dark = i < 6 ? m[i][8] : i < 8 ? m[i + 1][8] : m[n - 15 + i][8];
    if (dark) bits |= 1 << i;
  }
  return ((bits ^ 0x5412) >> 13) & 3;
}

describe("QR rules (spec sections 8 and 11)", () => {
  const url = qrTarget("https://qlosk.com", "7KX2M9");
  const raw = rawMatrix(url);
  const cleared = clearCentre(raw);
  const n = raw.length;

  it("uses error correction H", () => {
    assert.equal(errorCorrectionLevel(raw), 2);
  });
  it("clears the middle 9 x 9 modules and nothing else", () => {
    const from = (n - QR_CLEAR) / 2;
    let changed = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const inside = r >= from && r < from + QR_CLEAR && c >= from && c < from + QR_CLEAR;
        if (inside) assert.equal(cleared[r][c], false);
        else assert.equal(cleared[r][c], raw[r][c]);
        if (cleared[r][c] !== raw[r][c]) changed++;
      }
    }
    assert.ok(changed > 0);
  });
  it("the mark leaves about 1.5 modules of white and covers under 10% of the code", () => {
    assert.equal(QR_MARK, QR_CLEAR - 2 * 1.5);
    assert.ok((QR_CLEAR * QR_CLEAR) / (n * n) < 0.1);
    const art = buildQrArt(url);
    assert.equal(art.mark.x, (n - QR_MARK) / 2);
    assert.equal(art.mark.size, QR_MARK);
  });
  it("keeps the three corner squares dark", () => {
    for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      for (let i = 0; i < 7; i++) {
        for (const [r, c] of [[r0, c0 + i], [r0 + 6, c0 + i], [r0 + i, c0], [r0 + i, c0 + 6]]) {
          assert.equal(cleared[r][c], true, `finder ring at ${r},${c}`);
        }
      }
      for (let r = r0 + 2; r <= r0 + 4; r++) for (let c = c0 + 2; c <= c0 + 4; c++) assert.equal(cleared[r][c], true);
    }
  });
  it("refuses an address long enough to put an alignment pattern under the mark", () => {
    assert.throws(() => rawMatrix(`https://${"a".repeat(70)}.example.in/q/7KX2M9`), /too long/);
  });
});

describe("QR as SVG", () => {
  const svg = qrSvg(qrTarget("https://qlosk.com", "7KX2M9"));
  const n = rawMatrix(qrTarget("https://qlosk.com", "7KX2M9")).length;
  it("is vector, dark on white, with a 2-module white border", () => {
    assert.equal(svg.includes("<image"), false);
    assert.ok(svg.includes(`viewBox="0 0 ${n + 4} ${n + 4}"`));
    assert.ok(svg.includes('fill="#fff"'));
    assert.ok(svg.includes(`fill="${QR_INK}"`));
    assert.ok(svg.includes('transform="translate(2 2)"'));
  });
  it("is never coloured: only the ink and white appear", () => {
    const colours = new Set([...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]+)"/g)].map((m) => m[1].toLowerCase()));
    assert.deepEqual([...colours].sort(), ["#0d1f1b", "#fff"]);
  });
  it("art and svg agree", () => {
    const art = buildQrArt(qrTarget("https://qlosk.com", "7KX2M9"));
    assert.equal(qrArtSvg(art), svg);
  });
});
