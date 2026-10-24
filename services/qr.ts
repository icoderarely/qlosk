// QR code stock and assignment (spec sections 3, 4 and 8). A code is 6
// characters from an alphabet without look-alikes, never changes once printed,
// and is never reused after it is retired. Rules are plain functions so the
// store (lib/qr-store.ts) can run them inside its transaction and the tests can
// run them without a database. No Next.js imports.
import { randomInt } from "node:crypto";

export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0 O 1 I L
export const CODE_LENGTH = 6;
export const MAX_BATCH = 500;
export const QR_PAGE_SIZE = 10;

export type QrStatus = "unassigned" | "assigned" | "retired";

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

// People type codes in lower case or with spaces; scanning always gives upper case.
export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** `count` distinct random codes. `pick` is injectable so tests are repeatable. */
export function generateCodes(count: number, pick: (max: number) => number = (n) => randomInt(n)): string[] {
  const out = new Set<string>();
  while (out.size < count) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[pick(CODE_ALPHABET.length)];
    out.add(code);
  }
  return [...out];
}

// ---- Rules -------------------------------------------------------------------

export type QrRecord = { code: string; status: QrStatus; shopId: string | null };
/** `code` is the shop's assigned code, if it has one. */
export type ShopRef = { id: string; name: string; code: string | null };

export type Decision = { ok: true } | { ok: false; error: string };
const no = (error: string): Decision => ({ ok: false, error });

export function decideAssign(code: QrRecord | null, shop: ShopRef | null): Decision {
  if (!code) return no("That code does not exist.");
  if (code.status === "retired") return no("That code is retired and cannot be used again.");
  if (code.status === "assigned") return no("That code is already assigned. Reassign it instead.");
  if (!shop) return no("That shop does not exist.");
  if (shop.code) return no(`${shop.name} already has the code ${shop.code}. Reassign or retire it first.`);
  return { ok: true };
}

export function decideReassign(code: QrRecord | null, target: ShopRef | null): Decision {
  if (!code) return no("That code does not exist.");
  if (code.status === "retired") return no("That code is retired and cannot be used again.");
  if (code.status !== "assigned") return no("That code is not assigned to a shop yet. Assign it instead.");
  if (!target) return no("That shop does not exist.");
  if (target.id === code.shopId) return no("The code already belongs to that shop.");
  if (target.code) return no(`${target.name} already has the code ${target.code}. Reassign or retire it first.`);
  return { ok: true };
}

export function decideRetire(code: QrRecord | null): Decision {
  if (!code) return no("That code does not exist.");
  if (code.status === "retired") return no("That code is already retired.");
  return { ok: true };
}

// ---- Store -------------------------------------------------------------------

export type QrRow = {
  code: string;
  status: QrStatus;
  shopId: string | null;
  shopName: string | null;
  lastScan: Date | null;
};

export type QrFilter = { status: QrStatus | null; q: string };

export type QrStore = {
  list(filter: QrFilter, skip: number, take: number): Promise<{ rows: QrRow[]; total: number }>;
  counts(): Promise<Record<QrStatus, number>>;
  /** Which of these codes already exist, whatever their status (retired ones count). */
  existing(codes: string[]): Promise<string[]>;
  insertBatch(codes: string[], batchId: string): Promise<void>;
  /** Codes in stock, oldest first. */
  stock(take: number): Promise<string[]>;
  /** Shops that have no assigned code, by name. */
  shopsWithoutCode(take: number): Promise<{ id: string; name: string }[]>;
  // The three writes re-check the rule inside one transaction (with the shop
  // row locked), so two admins cannot give one shop two codes.
  assign(args: { code: string; shopId: string; userEmail: string }): Promise<Decision>;
  /** `undoable: false` is for moves made by Undo itself, so they do not offer another Undo. */
  reassign(args: { code: string; toShopId: string; userEmail: string; undoable?: boolean }): Promise<Decision>;
  /** Back to stock. Only for Undo of an assignment: the code must still belong to `shopId`. */
  release(args: { code: string; shopId: string; userEmail: string }): Promise<Decision>;
  retire(args: { code: string; userEmail: string }): Promise<Decision>;
  /** Removes these codes, but only the ones still unassigned. Returns how many went. */
  deleteUnassigned(codes: string[]): Promise<number>;
  find(code: string): Promise<QrRecord | null>;
};

export type QrListQuery = { status: QrStatus | "all"; q: string; page: number };

export function parseQrQuery(params: Record<string, string | string[] | undefined>): QrListQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = one(params.status);
  const page = Number.parseInt(one(params.page), 10);
  return {
    status: status === "assigned" || status === "unassigned" || status === "retired" ? status : "all",
    q: one(params.q).trim().slice(0, 60),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export type QrOverview = {
  counts: { total: number } & Record<QrStatus, number>;
  rows: QrRow[];
  total: number;
  page: number;
  pageCount: number;
  query: QrListQuery;
};

export async function getQrOverview(store: QrStore, query: QrListQuery): Promise<QrOverview> {
  const filter: QrFilter = { status: query.status === "all" ? null : query.status, q: query.q };
  let page = query.page;
  let result = await store.list(filter, (page - 1) * QR_PAGE_SIZE, QR_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(result.total / QR_PAGE_SIZE));
  if (page > pageCount) {
    page = pageCount;
    result = await store.list(filter, (page - 1) * QR_PAGE_SIZE, QR_PAGE_SIZE);
  }
  const counts = await store.counts();
  return {
    counts: { ...counts, total: counts.unassigned + counts.assigned + counts.retired },
    rows: result.rows,
    total: result.total,
    page,
    pageCount,
    query: { ...query, page },
  };
}

export type BatchResult = { ok: true; batchId: string; count: number } | { ok: false; error: string };

// Role checks belong to the caller (the server action calls requireRole first).
export async function generateBatch(
  store: QrStore,
  count: unknown,
  deps: { pick?: (max: number) => number; now?: Date; randomId?: () => string } = {},
): Promise<BatchResult> {
  const n = typeof count === "number" ? count : Number(count);
  if (!Number.isInteger(n) || n < 1) return { ok: false, error: "Enter how many codes to make." };
  if (n > MAX_BATCH) return { ok: false, error: `Make at most ${MAX_BATCH} codes at a time.` };

  // A new random code can match an existing one (retired included). Draw again
  // for just those, so a retired code is never handed out again.
  const fresh = new Set<string>();
  for (let round = 0; round < 20 && fresh.size < n; round++) {
    const wanted = n - fresh.size;
    const drawn = generateCodes(wanted, deps.pick).filter((c) => !fresh.has(c));
    const taken = new Set(await store.existing(drawn));
    for (const c of drawn) if (!taken.has(c)) fresh.add(c);
  }
  if (fresh.size < n) return { ok: false, error: "Could not make enough new codes. Try again." };

  const day = (deps.now ?? new Date()).toISOString().slice(0, 10);
  const batchId = `${day}-${(deps.randomId ?? (() => Math.random().toString(36).slice(2, 6)))()}`;
  await store.insertBatch([...fresh], batchId);
  return { ok: true, batchId, count: n };
}

export async function assignCode(store: QrStore, rawCode: string, shopId: string, userEmail: string): Promise<Decision> {
  return store.assign({ code: normalizeCode(rawCode), shopId, userEmail });
}

export async function reassignCode(store: QrStore, rawCode: string, toShopId: string, userEmail: string): Promise<Decision> {
  return store.reassign({ code: normalizeCode(rawCode), toShopId, userEmail });
}

export async function retireCode(store: QrStore, rawCode: string, userEmail: string): Promise<Decision> {
  return store.retire({ code: normalizeCode(rawCode), userEmail });
}

export type DeleteResult = { ok: true; count: number } | { ok: false; error: string };

// Only codes in stock can be deleted. An assigned code is on a shop's printed
// QR, and a retired one stays so it is never handed out again.
export async function deleteCodes(store: QrStore, rawCodes: unknown): Promise<DeleteResult> {
  if (!Array.isArray(rawCodes) || rawCodes.some((c) => typeof c !== "string")) {
    return { ok: false, error: "Choose the codes to delete." };
  }
  const codes = [...new Set((rawCodes as string[]).map(normalizeCode))];
  if (codes.length === 0) return { ok: false, error: "Choose the codes to delete." };
  if (codes.length > MAX_BATCH) return { ok: false, error: `Delete at most ${MAX_BATCH} codes at a time.` };
  if (!codes.every(isValidCode)) return { ok: false, error: "One of those is not a valid code." };
  const count = await store.deleteUnassigned(codes);
  if (count === 0) return { ok: false, error: "Only unassigned codes can be deleted. Nothing was deleted." };
  return { ok: true, count };
}

/** "12 minutes ago", for the Last scan column. */
export function formatAgo(then: Date | null, now: Date): string {
  if (!then) return "Never";
  const s = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (s < 60) return "Just now";
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"} ago`;
  if (s < 3600) return unit(Math.floor(s / 60), "minute");
  if (s < 86400) return unit(Math.floor(s / 3600), "hour");
  return unit(Math.floor(s / 86400), "day");
}
