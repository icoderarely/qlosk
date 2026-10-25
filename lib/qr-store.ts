import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  decideAssign,
  decideReassign,
  decideRetire,
  type QrRecord,
  type QrStore,
  type ShopRef,
} from "@/services/qr";

type Tx = Prisma.TransactionClient;

// Locks the shop rows (in a fixed order, so two moves cannot deadlock). With the
// lock held, "this shop has no code" cannot change until the transaction ends.
async function lockShops(tx: Tx, ids: string[]): Promise<void> {
  for (const id of [...new Set(ids)].sort()) {
    await tx.$queryRaw`SELECT id FROM shops WHERE id = ${id}::uuid FOR UPDATE`;
  }
}

async function recordOf(tx: Tx, code: string): Promise<QrRecord | null> {
  await tx.$queryRaw`SELECT code FROM qr_codes WHERE code = ${code} FOR UPDATE`;
  const row = await tx.qrCode.findUnique({ where: { code }, select: { code: true, status: true, shopId: true } });
  return row;
}

async function shopRef(tx: Tx, id: string): Promise<ShopRef | null> {
  const shop = await tx.shop.findUnique({
    where: { id },
    select: { id: true, name: true, qrCodes: { where: { status: "assigned" }, select: { code: true }, take: 1 } },
  });
  return shop ? { id: shop.id, name: shop.name, code: shop.qrCodes[0]?.code ?? null } : null;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unknownShop = { ok: false as const, error: "That shop does not exist." };

export function createQrStore(db: PrismaClient): QrStore {
  return {
    async list(filter, skip, take) {
      const where: Prisma.QrCodeWhereInput = {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.q
          ? {
              OR: [
                { code: { startsWith: filter.q.toUpperCase() } },
                { shop: { name: { contains: filter.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        db.qrCode.count({ where }),
        db.qrCode.findMany({
          where,
          skip,
          take,
          orderBy: [{ createdAt: "desc" }, { code: "asc" }],
          include: { shop: { select: { name: true } } },
        }),
      ]);
      const scans = rows.length
        ? await db.scanEvent.groupBy({
            by: ["code"],
            where: { code: { in: rows.map((r) => r.code) } },
            _max: { at: true },
          })
        : [];
      const last = new Map(scans.map((s) => [s.code, s._max.at]));
      return {
        total,
        rows: rows.map((r) => ({
          code: r.code,
          status: r.status,
          shopId: r.shopId,
          shopName: r.shop?.name ?? null,
          lastScan: last.get(r.code) ?? null,
        })),
      };
    },

    async counts() {
      const groups = await db.qrCode.groupBy({ by: ["status"], _count: { _all: true } });
      const out = { unassigned: 0, assigned: 0, retired: 0 };
      for (const g of groups) out[g.status] = g._count._all;
      return out;
    },

    async existing(codes) {
      const rows = await db.qrCode.findMany({ where: { code: { in: codes } }, select: { code: true } });
      return rows.map((r) => r.code);
    },

    async insertBatch(codes, batchId) {
      await db.qrCode.createMany({ data: codes.map((code) => ({ code, batchId })) });
    },

    async stock(take) {
      const rows = await db.qrCode.findMany({
        where: { status: "unassigned" },
        orderBy: [{ createdAt: "asc" }, { code: "asc" }],
        take,
        select: { code: true },
      });
      return rows.map((r) => r.code);
    },

    async shopsWithoutCode(take) {
      return db.shop.findMany({
        where: { status: { not: "archived" }, qrCodes: { none: { status: "assigned" } } },
        orderBy: { name: "asc" },
        take,
        select: { id: true, name: true },
      });
    },

    async find(code) {
      return db.qrCode.findUnique({ where: { code }, select: { code: true, status: true, shopId: true } });
    },

    async findMany(codes) {
      return db.qrCode.findMany({ where: { code: { in: codes } }, select: { code: true, status: true, shopId: true } });
    },

    async assign({ code, shopId, userEmail }) {
      if (!uuid.test(shopId)) return unknownShop;
      return db.$transaction(async (tx) => {
        await lockShops(tx, [shopId]);
        const decision = decideAssign(await recordOf(tx, code), await shopRef(tx, shopId));
        if (!decision.ok) return decision;
        await tx.qrCode.update({ where: { code }, data: { status: "assigned", shopId } });
        await tx.changeLog.create({
          data: {
            shopId,
            userEmail,
            what: `QR code ${code} assigned`,
            undoPayload: { kind: "qr", op: "assign", code, from: null },
          },
        });
        return decision;
      });
    },

    async reassign({ code, toShopId, userEmail, undoable = true }) {
      if (!uuid.test(toShopId)) return unknownShop;
      return db.$transaction(async (tx) => {
        const first = await tx.qrCode.findUnique({ where: { code }, select: { shopId: true } });
        await lockShops(tx, [toShopId, ...(first?.shopId ? [first.shopId] : [])]);
        const record = await recordOf(tx, code);
        const target = await shopRef(tx, toShopId);
        const decision = decideReassign(record, target);
        if (!decision.ok || !record?.shopId || !target) return decision;
        const from = await shopRef(tx, record.shopId);
        await tx.qrCode.update({ where: { code }, data: { shopId: toShopId } });
        await tx.changeLog.createMany({
          data: [
            {
              shopId: toShopId,
              userEmail,
              what: `QR code ${code} moved here from ${from?.name ?? "another shop"}`,
              ...(undoable ? { undoPayload: { kind: "qr", op: "reassign", code, from: record.shopId } } : {}),
            },
            {
              shopId: record.shopId,
              userEmail,
              what: `QR code ${code} moved to ${target.name}`,
            },
          ],
        });
        return decision;
      });
    },

    async release({ code, shopId, userEmail }) {
      void userEmail; // the "Undid ..." line is written by the caller
      return db.$transaction(async (tx) => {
        await lockShops(tx, [shopId]);
        const record = await recordOf(tx, code);
        if (!record || record.status !== "assigned" || record.shopId !== shopId) {
          return { ok: false as const, error: "That QR code has changed since, so this cannot be undone." };
        }
        await tx.qrCode.update({ where: { code }, data: { status: "unassigned", shopId: null } });
        return { ok: true as const };
      });
    },

    async deleteUnassigned(codes) {
      const r = await db.qrCode.deleteMany({ where: { code: { in: codes }, status: "unassigned", shopId: null } });
      return r.count;
    },

    async retire({ code, userEmail }) {
      return db.$transaction(async (tx) => {
        const first = await tx.qrCode.findUnique({ where: { code }, select: { shopId: true } });
        if (first?.shopId) await lockShops(tx, [first.shopId]);
        const record = await recordOf(tx, code);
        const decision = decideRetire(record);
        if (!decision.ok || !record) return decision;
        await tx.qrCode.update({ where: { code }, data: { status: "retired", shopId: null } });
        if (record.shopId) {
          await tx.changeLog.create({
            data: { shopId: record.shopId, userEmail, what: `QR code ${code} retired` },
          });
        }
        return decision;
      });
    },
  };
}
