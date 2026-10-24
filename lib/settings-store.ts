import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { SettingsStore } from "@/services/settings";

export function createSettingsStore(db: PrismaClient): SettingsStore {
  return {
    async get(key) {
      return (await db.setting.findUnique({ where: { key } }))?.value ?? null;
    },

    async save({ values, what, userEmail }) {
      await db.$transaction([
        ...Object.entries(values).map(([key, value]) =>
          db.setting.upsert({
            where: { key },
            create: { key, value: value as Prisma.InputJsonValue },
            update: { value: value as Prisma.InputJsonValue },
          }),
        ),
        db.changeLog.create({ data: { userEmail, what } }),
      ]);
    },
  };
}
