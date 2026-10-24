import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LOOK,
  MAX_NAME_LENGTH,
  lookToQuery,
  parseLook,
  whatsappLink,
} from "./look-url.ts";

describe("playground look URL", () => {
  it("reopens the same look from a copied URL", () => {
    const look = { theme: "nightfall", layout: "cover", font: "editorial", type: "gym", name: "Iron Works", tagline: "Strong every day" } as const;
    const params = Object.fromEntries(new URLSearchParams(lookToQuery(look)));
    assert.deepEqual(parseLook(params), look);
  });

  it("falls back on unknown or missing values", () => {
    assert.deepEqual(parseLook({ theme: "neon", layout: ["tiles", "list"], font: "x" }), {
      ...DEFAULT_LOOK,
      layout: "tiles",
    });
  });

  it("uses the suggested look for the type when the URL has none", () => {
    const look = parseLook({ type: "gym" }, { suggest: () => ({ theme: "nightfall", layout: "index" }) });
    assert.equal(look.theme, "nightfall");
    assert.equal(look.layout, "index");
  });

  it("ignores a theme that Settings has switched off", () => {
    const look = parseLook({ theme: "blush" }, { themes: ["daylight", "graphite"] });
    assert.equal(look.theme, "daylight");
  });

  it("limits the typed name", () => {
    const look = parseLook({ name: "x".repeat(200) });
    assert.equal(look.name.length, MAX_NAME_LENGTH);
  });

  it("builds a wa.me link with the chosen look in the message", () => {
    const url = whatsappLink(
      { ...DEFAULT_LOOK, name: "" },
      { theme: "Blush", layout: "List", font: "Clean", type: "Salon" },
      "+91 98765 43210",
    );
    assert.ok(url.startsWith("https://wa.me/919876543210?text="));
    assert.ok(decodeURIComponent(url).includes("Blush theme, List layout, Clean font"));
  });
});
