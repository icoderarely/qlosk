import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createLead,
  getOnboarding,
  moveStage,
  type BoardShop,
  type OnboardingStage,
  type OnboardingStore,
} from "./onboarding.ts";
import type { EditorStore } from "./shop-editor.ts";

const NOW = new Date("2026-10-24T12:00:00+05:30");
const daysBefore = (n: number) => new Date(NOW.getTime() - n * 24 * 3600_000);

const shop = (id: string, name: string, stage: OnboardingStage, daysInStage: number, extra: Partial<BoardShop> = {}): BoardShop => ({
  id,
  name,
  shopType: "Cafe",
  stage,
  stageChangedAt: daysBefore(daysInStage),
  hasPublished: false,
  hasLogo: true,
  code: null,
  planName: "Yearly",
  ownerName: null,
  ownerWhatsapp: null,
  scans: 0,
  ...extra,
});

function fake(shops: BoardShop[]) {
  const moves: { shopId: string; stage: OnboardingStage; from: OnboardingStage; what: string }[] = [];
  const store: OnboardingStore = {
    async board() {
      return shops;
    },
    async stageOf(id) {
      const s = shops.find((x) => x.id === id);
      return s ? { name: s.name, stage: s.stage } : null;
    },
    async setStage(args) {
      moves.push(args);
    },
  };
  return { store, moves };
}

describe("getOnboarding", () => {
  it("puts each shop in the column for its stage, longest waiting first", async () => {
    const { store } = fake([
      shop("1", "New", "building", 1),
      shop("2", "Old", "building", 6),
      shop("3", "Lead", "lead", 0),
      shop("4", "Sent", "preview_sent", 3),
    ]);
    const { columns } = await getOnboarding(store, NOW);
    assert.deepEqual(columns.map((c) => c.title), ["Lead", "Building", "Preview sent", "Printing", "Live this week"]);
    assert.deepEqual(columns[1].cards.map((c) => c.name), ["Old", "New"]);
    assert.equal(columns[0].cards[0].tag, "Today");
  });

  it("drops live shops from the board after a week", async () => {
    const { store } = fake([shop("1", "Fresh", "live", 2, { scans: 5 }), shop("2", "Stale", "live", 9)]);
    const { columns } = await getOnboarding(store, NOW);
    assert.deepEqual(columns[4].cards.map((c) => c.name), ["Fresh"]);
    assert.equal(columns[4].cards[0].tag, "Live 2 days ago");
  });

  it("warns about a preview left too long and a live page with no scans", async () => {
    const { store } = fake([
      shop("1", "Waiting", "preview_sent", 6),
      shop("2", "Silent", "live", 1),
    ]);
    const { columns } = await getOnboarding(store, NOW);
    assert.equal(columns[2].cards[0].tone, "red");
    assert.equal(columns[2].cards[0].tag, "Sent 6 days ago");
    assert.equal(columns[4].cards[0].tag, "No scans yet");
  });

  it("links the nudge to WhatsApp when the owner's number is known", async () => {
    const { store } = fake([
      shop("1", "With number", "preview_sent", 3, { ownerWhatsapp: "98200 12345" }),
      shop("2", "No number", "preview_sent", 3),
    ]);
    const { columns, today } = await getOnboarding(store, NOW);
    const [a, b] = columns[2].cards;
    assert.equal(a.action.external, true);
    assert.ok(a.action.href.startsWith("https://wa.me/919820012345"));
    assert.deepEqual(b.action, { label: "Open shop", href: "/admin/shops/2", external: false });
    assert.deepEqual(today.map((t) => t.label), ["Follow up with With number", "Follow up with No number"]);
  });

  it("lists today's tasks from what is really waiting", async () => {
    const { store } = fake([
      shop("1", "Ready", "building", 1, { hasPublished: true }),
      shop("2", "Standee", "printing", 1, { code: "ABC234" }),
      shop("3", "Not yet", "printing", 1),
    ]);
    const { today } = await getOnboarding(store, NOW);
    assert.deepEqual(today.map((t) => t.label), ["Send preview to Ready", "Ship Standee standee"]);
  });
});

describe("moveStage", () => {
  it("moves a card and logs where it came from", async () => {
    const { store, moves } = fake([shop("1", "Alpha", "building", 1)]);
    const result = await moveStage(store, "1", "printing", "me@example.com");
    assert.deepEqual(result, { ok: true });
    assert.equal(moves[0].stage, "printing");
    assert.equal(moves[0].what, "Onboarding: moved from Building to Printing");
  });

  it("refuses a column that does not exist, the same column, and a missing shop", async () => {
    const { store, moves } = fake([shop("1", "Alpha", "building", 1)]);
    assert.equal((await moveStage(store, "1", "archive", "me")).ok, false);
    assert.equal((await moveStage(store, "1", "building", "me")).ok, false);
    assert.equal((await moveStage(store, "nope", "lead", "me")).ok, false);
    assert.equal(moves.length, 0);
  });
});

describe("createLead", () => {
  function editor() {
    const created: { columns: { name: string; shopType: string | null }; internal: { ownerWhatsapp: string | null; notes: string | null } }[] = [];
    const store = {
      async slugAvailable() {
        return true;
      },
      async find() {
        return null;
      },
      async create(args: (typeof created)[number]) {
        created.push(args);
        return "new-id";
      },
    } as unknown as EditorStore;
    return { store, created };
  }

  it("makes a shop in the Lead column", async () => {
    const e = editor();
    const { store, moves } = fake([]);
    const result = await createLead(e.store, store, { name: " Sharma Opticals ", shopType: "Optician", whatsapp: "98200 12345", note: "Met in person" }, "me@example.com");
    assert.deepEqual(result, { ok: true, id: "new-id" });
    assert.equal(e.created[0].columns.name, "Sharma Opticals");
    assert.equal(e.created[0].internal.ownerWhatsapp, "98200 12345");
    assert.equal(e.created[0].internal.notes, "Met in person");
    assert.equal(moves[0].stage, "lead");
  });

  it("needs a name and a believable number", async () => {
    const e = editor();
    const { store, moves } = fake([]);
    assert.equal((await createLead(e.store, store, { name: " " }, "me")).ok, false);
    assert.equal((await createLead(e.store, store, { name: "A", whatsapp: "12" }, "me")).ok, false);
    assert.equal(e.created.length, 0);
    assert.equal(moves.length, 0);
  });
});
