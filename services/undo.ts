// What change_log.undo_payload can hold, and which entries may be undone.
// No Next.js imports.
import { z } from "zod";
import { FONT_IDS, LAYOUT_IDS, THEME_IDS } from "../components/shop-page/types.ts";

const SHOP_STATUSES = ["building", "preview", "live", "quiet", "expired", "paused", "archived"] as const;

export const undoPayloadSchema = z.discriminatedUnion("kind", [
  // Bulk look change (slice 4a): put the old look back.
  z.object({
    kind: z.literal("look"),
    before: z.object({ theme: z.enum(THEME_IDS), layout: z.enum(LAYOUT_IDS), font: z.enum(FONT_IDS) }),
  }),
  // Pause, resume, archive, restore.
  z.object({ kind: z.literal("status"), before: z.enum(SHOP_STATUSES) }),
  // An editor save: the draft as it was before.
  z.object({ kind: z.literal("draft"), config: z.record(z.string(), z.unknown()) }),
  // Assigning or moving a QR code. `from` is the shop it came from, if any.
  z.object({
    kind: z.literal("qr"),
    op: z.enum(["assign", "reassign"]),
    code: z.string().length(6),
    from: z.uuid().nullable(),
  }),
]);

export type UndoPayload = z.infer<typeof undoPayloadSchema>;

export function parseUndo(payload: unknown): UndoPayload | null {
  const r = undoPayloadSchema.safeParse(payload);
  return r.success ? r.data : null;
}

export type ChangeEntry = {
  id: string;
  what: string;
  userEmail: string;
  at: Date;
  undoPayload: unknown;
};

/**
 * Only the newest undoable change of each kind can be undone, so an undo never
 * overwrites something that was done after it. `entries` is newest first.
 */
export function undoableIds(entries: ChangeEntry[]): Set<string> {
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const e of entries) {
    const p = parseUndo(e.undoPayload);
    if (!p || seen.has(p.kind)) continue;
    seen.add(p.kind);
    ids.add(e.id);
  }
  return ids;
}
