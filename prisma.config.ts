import { defineConfig } from "prisma/config";

// The Prisma CLI does not read Next.js env files, so load them here. Real
// environment variables (CI, Vercel) win over file values.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file not present
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.ts",
  },
  datasource: {
    // Not env("DATABASE_URL"): `prisma generate` runs on postinstall in
    // builds where the variable may be absent, and env() throws when unset.
    url: process.env.DATABASE_URL ?? "",
  },
});
