import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { testShop } from "../../services/print-test-helpers.ts";
import { buildQrArt, qrTarget } from "../../services/qr-art.ts";
import { standeeInput } from "../../services/standee.ts";
import { FILE_FACES } from "./faces.ts";
import { renderStandeeSvg } from "./render.tsx";
import { STANDEE_DESIGNS, STANDEE_LIGHT_THEMES, DEFAULT_CHOICES, canvasHeight, bleedUnits } from "./types.ts";

const art = buildQrArt(qrTarget("https://qlosk.com", "7KX2M9"));
const svgFor = (shop = testShop(), choices = DEFAULT_CHOICES, bleed = false) => {
  const input = standeeInput(shop, choices, art);
  return renderStandeeSvg({ ...input, faces: FILE_FACES, bleed });
};

/** Baselines and text of every <text> element. */
function texts(svg: string): { y: number; text: string }[] {
  return [...svg.matchAll(/<text[^>]* y="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({ y: Number(m[1]), text: m[2] }));
}

describe("standee markup", () => {
  it("is one SVG sized to the page, with every text in a font we embed", () => {
    const svg = svgFor();
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes(`viewBox="0 0 560 ${canvasHeight("A5")}"`));
    const families = new Set([...svg.matchAll(/font-family="([^"]+)"/g)].map((m) => m[1]));
    const known = new Set(Object.values(FILE_FACES).map((f) => f.family));
    for (const f of families) assert.ok(known.has(f), `${f} is an embedded font`);
  });
  it("escapes what a shop owner types", () => {
    const svg = svgFor(testShop({ name: "Tom & Jerry <Cafe>", tagline: 'Say "hi"' }));
    assert.ok(svg.includes("Tom &amp; Jerry &lt;Cafe&gt;"));
    assert.equal(svg.includes("<Cafe>"), false);
  });
  it("paints 3 mm of bleed past the edge only when asked", () => {
    const b = bleedUnits("A5");
    assert.ok(Math.abs(b - (3 * 560) / 148) < 0.01);
    assert.ok(svgFor(testShop(), DEFAULT_CHOICES, true).includes(`viewBox="${-b} ${-b} `));
    assert.ok(svgFor(testShop(), DEFAULT_CHOICES, false).includes('viewBox="0 0 '));
  });
  it("the QR is paths on white in near-black, never in a theme colour", () => {
    for (const design of STANDEE_DESIGNS) {
      for (const theme of STANDEE_LIGHT_THEMES) {
        const svg = svgFor(testShop(), { ...DEFAULT_CHOICES, design, theme });
        const qr = svg.slice(svg.indexOf('aria-label="QR code"'));
        const group = qr.slice(0, qr.indexOf("</g></g>"));
        assert.ok(group.includes('fill="#FFFFFF"'));
        assert.ok(group.includes('fill="#0D1F1B"'));
        const colours = new Set([...group.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase()));
        assert.deepEqual([...colours].sort(), ["#0D1F1B", "#FFFFFF"], `${design} ${theme}`);
      }
    }
  });
  it("draws what the shop and the choices say", () => {
    const svg = svgFor(testShop(), { ...DEFAULT_CHOICES, design: "ticket", headline: "Scan for our menu" });
    const words = texts(svg).map((t) => t.text);
    assert.ok(words.includes("Velvet Salon &amp; Spa"));
    assert.ok(words.includes("Hair, skin and bridal studio"));
    assert.ok(words.includes("Scan for our menu"));
    assert.ok(words.includes("Review us on"));
    assert.ok(words.includes("Powered by"));
    assert.ok(words.includes("qlosk.com"));
    assert.ok(words.some((w) => w.startsWith("Point your phone camera")));
  });
});

// Worst-case words must stay on the page and clear of the credit line.
describe("long words stay inside the standee", () => {
  const long = "The Extraordinarily Long Named Neighbourhood Salon and Day Spa of Old Town Market Road";
  const tagline = "Hair, skin, bridal, nails, massage, wellness and much more for the whole family";
  for (const design of STANDEE_DESIGNS) {
    for (const size of ["A5", "A4"] as const) {
      it(`${design} ${size}`, () => {
        const shop = testShop({ name: long, tagline });
        const svg = svgFor(shop, { ...DEFAULT_CHOICES, design, size, headline: "x".repeat(39).replace(/x{4}/g, "xyz ") });
        const h = canvasHeight(size);
        const all = texts(svg);
        const powered = all.find((t) => t.text === "Powered by")!;
        for (const t of all.filter((t) => t.text !== "Powered by" && !/^[A-Z·\-]$/.test(t.text))) {
          assert.ok(t.y > 0 && t.y < h, `${t.text} is on the page`);
          if (!/^(qlosk\.com|Qlosk|·)$/.test(t.text)) assert.ok(t.y < powered.y - 8, `${t.text} (${t.y}) is above the credit line (${powered.y})`);
        }
      });
    }
  }
});
