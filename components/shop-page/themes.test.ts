import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio, MIN_TEXT_CONTRAST } from "../../lib/contrast.ts";
import { THEMES } from "./themes.ts";
import { THEME_IDS } from "./types.ts";

describe("shop page themes (spec section 5 rules)", () => {
  for (const id of THEME_IDS) {
    const t = THEMES[id];

    it(`${id}: button text on button colour reaches 4.5:1`, () => {
      assert.ok(contrastRatio(t.btntext, t.btn) >= MIN_TEXT_CONTRAST);
    });

    it(`${id}: body and muted text on page and card reach 4.5:1`, () => {
      for (const bg of [t.bg, t.card]) {
        assert.ok(contrastRatio(t.text, bg) >= MIN_TEXT_CONTRAST, "text");
        assert.ok(contrastRatio(t.muted, bg) >= MIN_TEXT_CONTRAST, "muted");
      }
    });

    it(`${id}: chip text and icon colour reach 4.5:1 on their backgrounds`, () => {
      assert.ok(contrastRatio(t.chiptext, t.chipbg) >= MIN_TEXT_CONTRAST);
      assert.ok(contrastRatio(t.iconfg, t.iconbg) >= MIN_TEXT_CONTRAST);
      assert.ok(contrastRatio(t.iconfg, t.card) >= MIN_TEXT_CONTRAST);
    });
  }
});
