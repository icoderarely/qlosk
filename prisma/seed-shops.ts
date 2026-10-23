// Adds 12 fake shops across statuses and looks so the admin has data to show.
// Run with `npm run db:seed:shops`. Safe to run again: shops that exist (same
// slug) are left alone. Remove them with `npm run db:seed:shops -- --remove`.
//
// Every row it writes is marked: shops have notes = 'seed:sample' and the QR
// codes have batch_id = 'seed-sample'. Plan prices are 0 because prices are set
// in admin (slice 9), not in code. Scan counts are made up, for display only.
import { randomUUID } from "node:crypto";
import { Client } from "pg";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file not present
  }
}

const MARK = "seed:sample";
const BATCH = "seed-sample";
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DIRECT_URL or DATABASE_URL is not set.");

type Status = "building" | "preview" | "live" | "quiet" | "expired" | "paused";
type Sample = {
  name: string;
  slug: string;
  type: string;
  area: string;
  city: string;
  phone: string;
  status: Status;
  theme: string;
  layout: string;
  font: string;
  code: string | null;
  plan: "Monthly" | "Yearly" | "5 years" | null;
  /** Days from today until the plan ends. Negative means already ended. */
  endsInDays: number | null;
  /** Scans per day over the last 30 days; null for no stats. */
  scansPerDay: number | null;
};

const SHOPS: Sample[] = [
  { name: "Velvet Salon & Spa", slug: "velvet-salon", type: "Salon and spa", area: "Bandra West", city: "Mumbai", phone: "+919800000001", status: "live", theme: "blush", layout: "list", font: "editorial", code: "7KX2M9", plan: "Yearly", endsInDays: 140, scansPerDay: 40 },
  { name: "Kaveri Sweets", slug: "kaveri-sweets", type: "Sweet shop", area: "T Nagar", city: "Chennai", phone: "+919800000002", status: "live", theme: "marigold", layout: "tiles", font: "clean", code: "R4PD8T", plan: "Monthly", endsInDays: 5, scansPerDay: 29 },
  { name: "Iron House Gym", slug: "iron-house", type: "Gym", area: "Koramangala", city: "Bengaluru", phone: "+919800000003", status: "live", theme: "nightfall", layout: "index", font: "clean", code: "M2HC6W", plan: "5 years", endsInDays: 1750, scansPerDay: 21 },
  { name: "Dr. Mehta Dental", slug: "dr-mehta-dental", type: "Clinic", area: "Navrangpura", city: "Ahmedabad", phone: "+919800000004", status: "quiet", theme: "daylight", layout: "list", font: "clean", code: "H8WQ5Z", plan: "Yearly", endsInDays: 70, scansPerDay: 0 },
  { name: "Noor Boutique", slug: "noor-boutique", type: "Boutique", area: "Banjara Hills", city: "Hyderabad", phone: "+919800000005", status: "live", theme: "blush", layout: "cover", font: "rounded", code: "C3TY7K", plan: "Yearly", endsInDays: 118, scansPerDay: 10 },
  { name: "Bright Minds Classes", slug: "bright-minds", type: "Coaching", area: "Kothrud", city: "Pune", phone: "+919800000006", status: "live", theme: "daylight", layout: "tiles", font: "clean", code: "P6LD2N", plan: "Monthly", endsInDays: 12, scansPerDay: 7 },
  { name: "Brew & Bun Cafe", slug: "brew-and-bun", type: "Cafe and bakery", area: "Indiranagar", city: "Bengaluru", phone: "+919800000007", status: "preview", theme: "marigold", layout: "chat", font: "rounded", code: "J9NV3B", plan: "Yearly", endsInDays: null, scansPerDay: null },
  { name: "Aarav Jewellers", slug: "aarav-jewellers", type: "Jeweller", area: "Zaveri Bazaar", city: "Mumbai", phone: "+919800000008", status: "preview", theme: "graphite", layout: "cover", font: "editorial", code: null, plan: "Yearly", endsInDays: null, scansPerDay: null },
  { name: "Sunrise Pharmacy", slug: "sunrise-pharmacy", type: "Clinic", area: "Sector 17", city: "Chandigarh", phone: "+919800000009", status: "building", theme: "daylight", layout: "list", font: "clean", code: null, plan: null, endsInDays: null, scansPerDay: null },
  { name: "Lotus Yoga Studio", slug: "lotus-yoga", type: "Gym", area: "Alkapuri", city: "Vadodara", phone: "+919800000010", status: "building", theme: "blush", layout: "index", font: "editorial", code: null, plan: null, endsInDays: null, scansPerDay: null },
  { name: "Old Town Tailors", slug: "old-town-tailors", type: "Boutique", area: "Chandni Chowk", city: "Delhi", phone: "+919800000011", status: "expired", theme: "graphite", layout: "list", font: "clean", code: "W5GF4S", plan: "Monthly", endsInDays: -20, scansPerDay: 2 },
  { name: "Green Leaf Cafe", slug: "green-leaf-cafe", type: "Cafe and bakery", area: "Camp", city: "Pune", phone: "+919800000012", status: "paused", theme: "nightfall", layout: "chat", font: "clean", code: "D7BK9X", plan: "Yearly", endsInDays: 200, scansPerDay: 3 },
];

const PLANS = [
  { name: "Monthly", months: 1 },
  { name: "Yearly", months: 12 },
  { name: "5 years", months: 60 },
];

const DAY = 86_400_000;
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");

  if (process.argv.includes("--remove")) {
    await client.query(`DELETE FROM qr_codes WHERE batch_id = $1`, [BATCH]);
    const res = await client.query(`DELETE FROM shops WHERE notes = $1`, [MARK]);
    await client.query("COMMIT");
    console.log(`Removed ${res.rowCount} sample shops.`);
  } else {
    const planIds = new Map<string, { id: string; months: number }>();
    for (const p of PLANS) {
      const found = await client.query<{ id: string }>(`SELECT id FROM plans WHERE name = $1`, [p.name]);
      let id = found.rows[0]?.id;
      if (!id) {
        id = randomUUID();
        await client.query(
          `INSERT INTO plans (id, name, months, price_paise) VALUES ($1, $2, $3, 0)`,
          [id, p.name, p.months],
        );
      }
      planIds.set(p.name, { id, months: p.months });
    }

    const now = Date.now();
    let added = 0;
    for (const [i, s] of SHOPS.entries()) {
      const exists = await client.query(`SELECT 1 FROM shops WHERE slug = $1`, [s.slug]);
      if (exists.rowCount) continue;

      const plan = s.plan ? planIds.get(s.plan) : undefined;
      const ends = s.endsInDays === null ? null : new Date(now + s.endsInDays * DAY);
      const started =
        ends && plan ? new Date(ends.getTime() - plan.months * 30 * DAY) : null;
      const shopId = randomUUID();
      // Newest first in the list matches the order above.
      const createdAt = new Date(now - i * 3600_000);
      await client.query(
        `INSERT INTO shops (id, slug, name, shop_type, area, city, phone, status, notes,
                            plan_id, plan_started_at, plan_ends_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
        [shopId, s.slug, s.name, s.type, s.area, s.city, s.phone, s.status, MARK,
         plan?.id ?? null, started, ends, createdAt],
      );

      const config = JSON.stringify({ theme: s.theme, layout: s.layout, font: s.font });
      await client.query(
        `INSERT INTO shop_pages (shop_id, state, config, published_at) VALUES ($1, 'draft', $2, NULL)`,
        [shopId, config],
      );
      if (s.status === "live" || s.status === "quiet" || s.status === "expired" || s.status === "paused") {
        await client.query(
          `INSERT INTO shop_pages (shop_id, state, config, published_at) VALUES ($1, 'published', $2, now())`,
          [shopId, config],
        );
      }

      if (s.code) {
        await client.query(
          `INSERT INTO qr_codes (code, shop_id, status, batch_id)
           VALUES ($1, $2, 'assigned', $3) ON CONFLICT (code) DO NOTHING`,
          [s.code, shopId, BATCH],
        );
      }

      if (s.scansPerDay !== null) {
        for (let d = 0; d < 30; d++) {
          const day = new Date(now - d * DAY).toISOString().slice(0, 10);
          const scans = s.scansPerDay === 0 ? 0 : Math.max(0, s.scansPerDay + ((d * 7 + i) % 5) - 2);
          await client.query(
            `INSERT INTO daily_stats (shop_id, day, scans, taps) VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING`,
            [shopId, day, scans, Math.round(scans * 0.6)],
          );
        }
      }
      added++;
    }
    await client.query("COMMIT");
    console.log(`Added ${added} sample shops (${SHOPS.length - added} already there).`);
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
