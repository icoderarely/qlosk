import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Needs a running server: SHARE_CARD_URL=http://localhost:3000/s/<slug>/og npm test
const URL_TO_CHECK = process.env.SHARE_CARD_URL;

describe("GET /s/<slug>/og", { skip: URL_TO_CHECK ? false : "set SHARE_CARD_URL to a running /s/<slug>/og address" }, () => {
  it("returns a 1200 x 630 PNG with a public cache header", async () => {
    const res = await fetch(URL_TO_CHECK!);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/png");
    assert.match(res.headers.get("cache-control") ?? "", /public/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.deepEqual(Array.from(bytes.slice(1, 4)), [0x50, 0x4e, 0x47]); // "PNG"
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    assert.equal(view.getUint32(16), 1200); // IHDR width
    assert.equal(view.getUint32(20), 630); // IHDR height
  });
});
