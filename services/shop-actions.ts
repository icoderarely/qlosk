// Pause, resume, archive and restore a shop, and Undo for simple changes
// (spec section 4: change_log "powers the Activity tab and Undo"). Reads and
// writes go through a store; lib/shop-actions-store.ts is the Prisma one.
// No Next.js imports.
import type { DbShopStatus } from "./shops.ts";
import type { Decision, QrRecord, QrStore } from "./qr.ts";

import { parseUndo, undoableIds, type ChangeEntry, type UndoPayload } from "./undo.ts";

export type StatusOp = "pause" | "resume" | "archive" | "restore";

const no = (error: string): Decision => ({ ok: false, error });

/** The status a shop moves to, or an error message. */
export function nextStatus(
  current: DbShopStatus,
  op: StatusOp,
  hasPublished: boolean,
): { ok: true; status: DbShopStatus } | { ok: false; error: string } {
  // A resumed or restored shop goes back to live if it has a published page,
  // otherwise to building.
  const back: DbShopStatus = hasPublished ? "live" : "building";
  switch (op) {
    case "pause":
      return current === "paused" || current === "archived"
        ? { ok: false, error: "This shop is already paused or archived." }
        : { ok: true, status: "paused" };
    case "resume":
      return current === "paused" ? { ok: true, status: back } : { ok: false, error: "This shop is not paused." };
    case "archive":
      return current === "archived" ? { ok: false, error: "This shop is already archived." } : { ok: true, status: "archived" };
    case "restore":
      return current === "archived" ? { ok: true, status: back } : { ok: false, error: "This shop is not archived." };
  }
}

const WHAT: Record<StatusOp, string> = {
  pause: "Shop paused. The public page is hidden.",
  resume: "Shop resumed",
  archive: "Shop archived. The public page is hidden.",
  restore: "Shop restored from the archive",
};

export type ShopActionsStore = {
  status(shopId: string): Promise<{ status: DbShopStatus; hasPublished: boolean } | null>;
  setStatus(args: {
    shopId: string;
    status: DbShopStatus;
    what: string;
    undo: UndoPayload;
    userEmail: string;
  }): Promise<void>;
  /** Newest first. */
  changes(shopId: string, take: number): Promise<ChangeEntry[]>;
  change(shopId: string, changeId: string): Promise<ChangeEntry | null>;
  /** Puts the old value back and, in the same transaction, clears the entry's
   * undo payload and writes the "Undid ..." line. */
  applyUndo(args: {
    shopId: string;
    changeId: string;
    action:
      | { type: "look"; look: { theme: string; layout: string; font: string } }
      | { type: "status"; status: DbShopStatus }
      | { type: "draft"; config: Record<string, unknown> };
    what: string;
    userEmail: string;
  }): Promise<void>;
  /** Clears the payload and writes the "Undid ..." line, for changes undone elsewhere (QR codes). */
  finishUndo(args: { shopId: string; changeId: string; what: string; userEmail: string }): Promise<void>;
};

export async function changeShopStatus(
  store: ShopActionsStore,
  shopId: string,
  op: StatusOp,
  userEmail: string,
): Promise<Decision> {
  const current = await store.status(shopId);
  if (!current) return no("This shop no longer exists.");
  const next = nextStatus(current.status, op, current.hasPublished);
  if (!next.ok) return next;
  await store.setStatus({
    shopId,
    status: next.status,
    what: WHAT[op],
    undo: { kind: "status", before: current.status },
    userEmail,
  });
  return { ok: true };
}

export async function undoChange(
  deps: { store: ShopActionsStore; qr: QrStore },
  shopId: string,
  changeId: string,
  userEmail: string,
): Promise<Decision> {
  const entry = await deps.store.change(shopId, changeId);
  const payload = entry ? parseUndo(entry.undoPayload) : null;
  if (!entry || !payload) return no("This change cannot be undone.");

  // Only the newest change of its kind: look at the recent history to check.
  const recent = await deps.store.changes(shopId, 50);
  if (!undoableIds(recent).has(entry.id)) {
    return no("A newer change of the same kind exists. Undo that one first.");
  }

  const what = `Undid: ${entry.what}`;
  switch (payload.kind) {
    case "look":
      await deps.store.applyUndo({ shopId, changeId, action: { type: "look", look: payload.before }, what, userEmail });
      return { ok: true };
    case "status": {
      await deps.store.applyUndo({ shopId, changeId, action: { type: "status", status: payload.before }, what, userEmail });
      return { ok: true };
    }
    case "draft":
      await deps.store.applyUndo({ shopId, changeId, action: { type: "draft", config: payload.config }, what, userEmail });
      return { ok: true };
    case "qr": {
      const record: QrRecord | null = await deps.qr.find(payload.code);
      if (!record || record.shopId !== shopId || record.status !== "assigned") {
        return no("That QR code has changed since, so this cannot be undone.");
      }
      // An assignment goes back to stock; a move goes back to the shop it came
      // from. The store re-checks the rules inside its transaction.
      const result =
        payload.op === "assign" || !payload.from
          ? await deps.qr.release({ code: payload.code, shopId, userEmail })
          : await deps.qr.reassign({ code: payload.code, toShopId: payload.from, userEmail, undoable: false });
      if (!result.ok) return result;
      await deps.store.finishUndo({ shopId, changeId, what, userEmail });
      return { ok: true };
    }
  }
}
