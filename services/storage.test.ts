import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_UPLOAD_BYTES, saveShopImage, sniffImage, type ImageStore } from "./storage.ts";

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);

function deps(opts: { fail?: boolean } = {}) {
  const puts: { key: string; bytes: Uint8Array; type: string }[] = [];
  const store: ImageStore = {
    async put(key, bytes, type) {
      puts.push({ key, bytes, type });
      return `https://files.example/${key}`;
    },
  };
  return {
    puts,
    deps: {
      store,
      reencode: async (bytes: Uint8Array) => {
        if (opts.fail) throw new Error("corrupt");
        return Uint8Array.from([...bytes, 1]);
      },
      randomId: () => "abc123",
    },
  };
}

describe("sniffImage", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    assert.equal(sniffImage(JPEG), "jpeg");
    assert.equal(sniffImage(PNG), "png");
    assert.equal(sniffImage(WEBP), "webp");
  });

  it("rejects everything else, including SVG, HTML and GIF", () => {
    for (const text of ["<svg xmlns='http://www.w3.org/2000/svg'/>", "<html></html>", "GIF89a....", "%PDF-1.7"]) {
      assert.equal(sniffImage(Buffer.from(text)), null, text);
    }
  });
});

describe("saveShopImage", () => {
  it("stores the re-encoded file, not the original", async () => {
    const { deps: d, puts } = deps();
    const r = await saveShopImage(d, { shopId: "s1", kind: "logo", bytes: JPEG });
    assert.deepEqual(r, { ok: true, url: "https://files.example/shops/s1/logo-abc123.webp" });
    assert.equal(puts[0].type, "image/webp");
    assert.deepEqual(Array.from(puts[0].bytes), [...JPEG, 1]);
  });

  it("uses a shared folder for a shop that is not saved yet", async () => {
    const { deps: d } = deps();
    const r = await saveShopImage(d, { shopId: null, kind: "cover", bytes: PNG });
    assert.equal(r.ok && r.url.includes("shops/new/cover-"), true);
  });

  it("rejects files that are not images, whatever they are named", async () => {
    const { deps: d, puts } = deps();
    const r = await saveShopImage(d, { shopId: null, kind: "logo", bytes: Buffer.from("<svg onload=alert(1)>") });
    assert.equal(r.ok, false);
    assert.equal(puts.length, 0);
  });

  it("rejects an empty file and one over the size limit", async () => {
    const { deps: d, puts } = deps();
    assert.equal((await saveShopImage(d, { shopId: null, kind: "logo", bytes: new Uint8Array() })).ok, false);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(JPEG);
    const r = await saveShopImage(d, { shopId: null, kind: "logo", bytes: big });
    assert.equal(r.ok, false);
    assert.equal(puts.length, 0);
  });

  it("rejects an image that looks right but cannot be decoded", async () => {
    const { deps: d, puts } = deps({ fail: true });
    const r = await saveShopImage(d, { shopId: null, kind: "logo", bytes: JPEG });
    assert.equal(r.ok, false);
    assert.equal(puts.length, 0);
  });

  it("rejects an unknown kind", async () => {
    const { deps: d } = deps();
    // @ts-expect-error a kind the types do not allow
    assert.equal((await saveShopImage(d, { shopId: null, kind: "../../x", bytes: JPEG })).ok, false);
  });
});
