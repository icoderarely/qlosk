import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySuggestions,
  classifyInput,
  defaultWaMessage,
  quickSetup,
  resolveGoogleLink,
  reviewUrl,
  toPlaceMatch,
  type FetchFn,
} from "./quick-setup.ts";
import { newShopValues } from "./shop-editor.ts";

const SEARCH =
  "https://www.google.com/search?kgmid=/g/11cmqqddkw&hl=en-IN&q=Classic+Veg+Restaurant&source=sh/x/loc/osrp/m5/1";

// A fetch that answers from a table of url -> redirect or JSON.
function fakeFetch(routes: Record<string, { status?: number; location?: string; json?: unknown }>): FetchFn {
  return (async (input: RequestInfo | URL) => {
    const key = String(input);
    const route = routes[key];
    if (!route) throw new Error(`unexpected fetch ${key}`);
    const headers = new Headers(route.location ? { location: route.location } : {});
    return new Response(route.json ? JSON.stringify(route.json) : "", { status: route.status ?? 200, headers });
  }) as FetchFn;
}

const SHARE_ROUTES = {
  "https://share.google/abc": { status: 302, location: "https://www.google.com/share.google?q=abc" },
  "https://www.google.com/share.google?q=abc": { status: 301, location: SEARCH },
};

describe("classifyInput", () => {
  it("sorts a mixed paste", () => {
    const r = classifyInput(
      "https://share.google/abc\nhttps://www.instagram.com/classicveg.pune/?hl=en\nwww.classicveg.in\nhttps://facebook.com/x",
    );
    assert.deepEqual(r.googleLinks, ["https://share.google/abc"]);
    assert.equal(r.instagram, "https://instagram.com/classicveg.pune");
    assert.equal(r.website, "https://www.classicveg.in/");
    assert.deepEqual(r.unknown, ["https://facebook.com/x"]);
  });

  it("takes an @handle and upgrades an http website", () => {
    const r = classifyInput("@classicveg http://classicveg.in");
    assert.equal(r.instagram, "https://instagram.com/classicveg");
    assert.equal(r.website, "https://classicveg.in/");
  });

  it("does not treat an Instagram post link as a handle", () => {
    assert.equal(classifyInput("https://instagram.com/p/xyz").instagram, null);
  });

  it("rejects non-links and other Google pages", () => {
    const r = classifyInput("hello https://www.google.com/docs");
    assert.deepEqual(r.googleLinks, []);
    assert.equal(r.unknown.length, 2);
  });
});

describe("resolveGoogleLink", () => {
  it("follows a share link to the business name", async () => {
    const found = await resolveGoogleLink("https://share.google/abc", fakeFetch(SHARE_ROUTES));
    assert.equal(found?.name, "Classic Veg Restaurant");
  });

  it("reads the name and position from a Maps place link without fetching", async () => {
    const url = "https://www.google.com/maps/place/Classic+Veg/@18.5204,73.8567,17z/data=x";
    const found = await resolveGoogleLink(url, fakeFetch({}));
    assert.deepEqual(found, { name: "Classic Veg", lat: 18.5204, lng: 73.8567, cid: null });
  });

  it("refuses a redirect that leaves Google", async () => {
    const routes = { "https://share.google/abc": { status: 302, location: "https://evil.example/x?q=Shop" } };
    assert.equal(await resolveGoogleLink("https://share.google/abc", fakeFetch(routes)), null);
  });
});

describe("quickSetup", () => {
  const place = {
    id: "ChIJabc",
    displayName: { text: "Classic Veg Restaurant" },
    formattedAddress: "12 FC Road, Pune 411004",
    nationalPhoneNumber: "098200 12345",
    websiteUri: "https://classicveg.in/",
    googleMapsUri: "https://maps.google.com/?cid=1",
  };
  const routes = { ...SHARE_ROUTES, "https://places.googleapis.com/v1/places:searchText": { json: { places: [place] } } };

  it("fills every field from a share link", async () => {
    const r = await quickSetup({ fetch: fakeFetch(routes), apiKey: "k" }, "https://share.google/abc @classicveg", "");
    assert.ok(r.ok);
    const by = Object.fromEntries(r.fields.map((f) => [f.key, f.value]));
    assert.equal(by.name, "Classic Veg Restaurant");
    assert.equal(by.phone, "098200 12345");
    assert.equal(by.whatsapp, "098200 12345");
    assert.equal(by.maps, "https://maps.google.com/?cid=1");
    assert.equal(by.review, "https://search.google.com/local/writereview?placeid=ChIJabc");
    assert.equal(by.website, "https://classicveg.in/");
    assert.equal(by.instagram, "https://instagram.com/classicveg");
    assert.match(by.waMessage, /Hi Classic Veg Restaurant!.*Qlosk/);
  });

  it("does not offer a landline for WhatsApp", async () => {
    const landline = { ...place, nationalPhoneNumber: "020 2345 6789" };
    const r = await quickSetup(
      { fetch: fakeFetch({ ...routes, "https://places.googleapis.com/v1/places:searchText": { json: { places: [landline] } } }), apiKey: "k" },
      "https://share.google/abc",
      "",
    );
    assert.ok(r.ok);
    assert.ok(!r.fields.some((f) => f.key === "whatsapp"));
  });

  it("without a key, gives the name but no guessed directions link", async () => {
    const r = await quickSetup({ fetch: fakeFetch(SHARE_ROUTES), apiKey: null }, "https://share.google/abc", "");
    assert.ok(r.ok && !r.placeFound);
    const by = Object.fromEntries(r.fields.map((f) => [f.key, f.value]));
    assert.equal(by.name, "Classic Veg Restaurant");
    assert.ok(!by.maps && !by.phone && !by.review);
    assert.match(r.note ?? "", /paste the Maps link/);
  });

  it("uses the exact place when a Maps link carries its cid", async () => {
    const url = "https://www.google.com/maps/place/Classic+Veg/@18.5,73.8,17z/data=!4m6!3m5!1s0x3bc2c0:0xff!8m2";
    const r = await quickSetup({ fetch: fakeFetch({}), apiKey: null }, url, "");
    assert.ok(r.ok);
    assert.equal(r.fields.find((f) => f.key === "maps")?.value, "https://maps.google.com/?cid=255");
  });

  it("still works for Instagram alone, with no key", async () => {
    const r = await quickSetup({ fetch: fakeFetch({}), apiKey: null }, "@classicveg", "Classic Veg");
    assert.ok(r.ok && !r.placeFound);
    assert.deepEqual(r.fields.map((f) => f.key), ["instagram", "waMessage"]);
  });

  it("falls back to the link's own data when Google refuses the key", async () => {
    const r = await quickSetup({ fetch: fakeFetch({ ...SHARE_ROUTES, "https://places.googleapis.com/v1/places:searchText": { status: 403 } }), apiKey: "k" }, "https://share.google/abc", "");
    assert.ok(r.ok && !r.placeFound);
    assert.match(r.note ?? "", /refused/);
    assert.ok(r.fields.some((f) => f.key === "name"));
  });

  it("asks for something to work with when the paste has nothing usable", async () => {
    const r = await quickSetup({ fetch: fakeFetch({}), apiKey: "k" }, "hello", "");
    assert.equal(r.ok, false);
  });
});

describe("toPlaceMatch", () => {
  it("needs an id and a name", () => {
    assert.equal(toPlaceMatch({ id: "x" }), null);
  });
});

describe("applySuggestions", () => {
  it("writes details and button targets, adding a missing button", () => {
    const values = newShopValues();
    const next = applySuggestions(values, [
      { key: "name", label: "", value: "Classic Veg" },
      { key: "phone", label: "", value: "98200 12345" },
      { key: "review", label: "", value: reviewUrl("ChIJabc") },
      { key: "website", label: "", value: "https://classicveg.in/" },
      { key: "waMessage", label: "", value: "ignored, rewritten from the name" },
    ]);
    assert.equal(next.details.name, "Classic Veg");
    assert.equal(next.details.phone, "98200 12345");
    assert.equal(next.details.waMessage, defaultWaMessage("Classic Veg"));
    assert.equal(next.links.find((l) => l.type === "google_review")?.target, reviewUrl("ChIJabc"));
    assert.equal(next.links.find((l) => l.type === "website")?.target, "https://classicveg.in/");
    assert.equal(values.details.name, "", "the input is not mutated");
  });

  it("leaves fields that were not chosen alone", () => {
    const values = newShopValues();
    const next = applySuggestions(values, [{ key: "address", label: "", value: "12 FC Road" }]);
    assert.equal(next.details.address, "12 FC Road");
    assert.equal(next.details.phone, "");
    assert.equal(next.details.waMessage, "");
  });
});
