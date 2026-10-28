import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LinkType, ShopPageProps } from "../components/shop-page/types.ts";
import {
  actionsSentence,
  initialsFor,
  nameSizeFor,
  shareCardModel,
  shareDescription,
  shareImagePath,
  shareMeta,
} from "./share-card.ts";

function props(types: LinkType[], shop: Partial<ShopPageProps["shop"]> = {}): ShopPageProps {
  return {
    theme: "blush",
    layout: "list",
    font: "clean",
    shop: { name: "Velvet Salon", tagline: "Hair and skin", area: "Bandra West", ...shop },
    links: types.map((type, i) => ({ id: `l${i}`, type, label: type, href: "#" })),
  };
}

describe("share card model", () => {
  it("shows Call, WhatsApp, Reviews and Maps pills in that order, and + more when other buttons are on", () => {
    const m = shareCardModel(props(["instagram", "maps", "call", "google_review", "whatsapp", "wifi"]));
    assert.deepEqual(m.pills.map((p) => p.label), ["Call", "WhatsApp", "Reviews", "Maps"]);
    assert.equal(m.more, true);
  });

  it("only draws pills for buttons the shop has on, and leaves out + more when nothing else is on", () => {
    const m = shareCardModel(props(["call", "maps"]));
    assert.deepEqual(m.pills.map((p) => p.label), ["Call", "Maps"]);
    assert.equal(m.more, false);
  });

  it("shows + more alone when the shop has only other buttons", () => {
    const m = shareCardModel(props(["instagram"]));
    assert.deepEqual(m.pills, []);
    assert.equal(m.more, true);
  });

  it("sizes the name by length: 84 up to 14 characters, 68 up to 22, 54 beyond", () => {
    assert.deepEqual([nameSizeFor("GYMMERZZ"), nameSizeFor("a".repeat(14)), nameSizeFor("a".repeat(15)), nameSizeFor("a".repeat(22)), nameSizeFor("a".repeat(23))], [84, 84, 68, 68, 54]);
  });

  it("makes initials from the first two words", () => {
    assert.equal(initialsFor("GYMMERZZ"), "G");
    assert.equal(initialsFor("Velvet Salon & Spa"), "VS");
    assert.equal(initialsFor("  ... "), "Q");
  });

  it("clips a very long name and tagline", () => {
    const m = shareCardModel(props(["call"], { name: "N".repeat(80), tagline: "t".repeat(200) }));
    assert.equal(Array.from(m.name).length, 40);
    assert.equal(Array.from(m.tagline ?? "").length, 72);
  });
});

describe("share text", () => {
  it("lists only the buttons that are on", () => {
    assert.equal(actionsSentence(props(["call", "whatsapp", "google_review", "maps"])), "Call, WhatsApp, reviews and directions.");
    assert.equal(actionsSentence(props(["whatsapp", "maps"])), "WhatsApp and directions.");
    assert.equal(actionsSentence(props(["maps"])), "directions.");
    assert.equal(actionsSentence(props(["instagram"])), "");
  });

  it("writes <tagline>. Call, WhatsApp, reviews and directions.", () => {
    assert.equal(shareDescription(props(["call", "whatsapp", "google_review", "maps"], { tagline: "Best Gym in Miraroad." })), "Best Gym in Miraroad. Call, WhatsApp, reviews and directions.");
    assert.equal(shareDescription(props(["whatsapp", "maps"], { tagline: "Hair and skin" })), "Hair and skin. WhatsApp and directions.");
  });

  it("falls back to the shop name when there is no tagline", () => {
    assert.equal(shareDescription(props(["call"], { tagline: null })), "Velvet Salon on one page. Call.");
  });
});

describe("share metadata", () => {
  const meta = shareMeta({ slug: "velvet", props: props(["call"]), publishedAt: new Date("2026-10-25T10:00:00Z"), origin: "https://qlosk.com" });

  it("uses the shop name alone as title, and the canonical address as url", () => {
    assert.equal(meta.title, "Velvet Salon");
    assert.equal(meta.openGraph.title, "Velvet Salon");
    assert.equal(meta.openGraph.url, "https://qlosk.com/s/velvet");
    assert.equal(meta.openGraph.siteName, "Qlosk");
    assert.equal(meta.openGraph.type, "website");
  });

  it("points the image at /og with the publish time as ?v=, so each publish gets a fresh address", () => {
    const first = Math.floor(new Date("2026-10-25T10:00:00Z").getTime() / 1000);
    assert.deepEqual(meta.openGraph.images, [{ url: `/qr/s/velvet/og?v=${first}`, width: 1200, height: 630, alt: "Velvet Salon" }]);
    assert.notEqual(shareImagePath("velvet", new Date("2026-10-25T10:00:01Z")), shareImagePath("velvet", new Date("2026-10-25T10:00:00Z")));
    assert.equal(meta.twitter.card, "summary_large_image");
  });
});
