// Adds raw scan and tap events with a known hand count, for checking Overview
// and Reports. Run `npm run db:seed:shops` first, then `npm run db:seed:events`,
// then run the nightly job (GET /api/cron/daily-stats with the CRON_SECRET) so
// daily_stats is rebuilt from these events. Remove them with `-- --remove`
// (re-run the job afterwards).
//
// Hand count, yesterday (India day) unless noted:
//   Velvet Salon: 12 counted scans, 3 crawler scans, 2 duplicate scans,
//     5 counted taps (WhatsApp 3, Call 1, Google review 1), 1 no_token tap;
//     plus 4 counted scans today.        -> counted 16 scans, 5 taps, 6 filtered
//   Iron House:   20 counted scans and 40 held for review (spike_review).
//                                         -> counted 20 scans, 40 held
// Events are marked with an ip_hash starting "seed-events-". Buttons are added
// to a sample shop only when it has none (and are left in place on --remove).
import { Client } from "pg";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file not present
  }
}

const TAG = "seed-events-";
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DIRECT_URL or DATABASE_URL is not set.");

const client = new Client({ connectionString: databaseUrl });
await client.connect();

// 10:00 India time yesterday, as a timestamp.
const YESTERDAY = `((date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - interval '1 day' + interval '10 hours') AT TIME ZONE 'Asia/Kolkata')`;

async function shopRow(slug: string): Promise<{ id: string; code: string }> {
  const res = await client.query<{ id: string; code: string }>(
    `SELECT s.id, q.code FROM shops s JOIN qr_codes q ON q.shop_id = s.id AND q.status = 'assigned' WHERE s.slug = $1 LIMIT 1`,
    [slug],
  );
  if (!res.rows[0]) throw new Error(`Sample shop ${slug} with a QR code not found. Run npm run db:seed:shops first.`);
  return res.rows[0];
}

async function linkIds(shopId: string): Promise<Record<"whatsapp" | "call" | "google_review", string>> {
  const found = await client.query<{ id: string; type: string }>(`SELECT id, type FROM links WHERE shop_id = $1`, [shopId]);
  const byType = new Map(found.rows.map((r) => [r.type, r.id]));
  const targets = { whatsapp: "https://wa.me/919800000001", call: "tel:+919800000001", google_review: "https://g.page/r/example/review" };
  const labels = { whatsapp: "Book on WhatsApp", call: "Call us", google_review: "Review us on Google" };
  let position = found.rows.length;
  for (const type of ["whatsapp", "call", "google_review"] as const) {
    if (byType.has(type)) continue;
    const res = await client.query<{ id: string }>(
      `INSERT INTO links (id, shop_id, type, label, target, position, enabled) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true) RETURNING id`,
      [shopId, type, labels[type], targets[type], position++],
    );
    byType.set(type, res.rows[0].id);
  }
  return { whatsapp: byType.get("whatsapp") ?? "", call: byType.get("call") ?? "", google_review: byType.get("google_review") ?? "" };
}

async function scans(n: number, shopId: string, code: string, when: string, flag: { reason: string | null }, label: string) {
  await client.query(
    `INSERT INTO scan_events (code, shop_id, at, ip_hash, ua_family, is_bot, bot_reason)
     SELECT $1, $2, ${when} + (i * interval '1 minute'), $3 || $4 || '-' || i, 'chrome', $5::boolean, $6::bot_reason
     FROM generate_series(1, $7) AS i`,
    [code, shopId, TAG, label, flag.reason !== null, flag.reason, n],
  );
}

async function taps(n: number, shopId: string, linkId: string, flag: { reason: string | null }, label: string) {
  await client.query(
    `INSERT INTO click_events (shop_id, link_id, at, ip_hash, is_bot, bot_reason)
     SELECT $1, $2, ${YESTERDAY} + (i * interval '1 minute') + interval '30 minutes', $3 || $4 || '-' || i, $5::boolean, $6::bot_reason
     FROM generate_series(1, $7) AS i`,
    [shopId, linkId, TAG, label, flag.reason !== null, flag.reason, n],
  );
}

try {
  await client.query("BEGIN");
  await client.query(`DELETE FROM scan_events WHERE ip_hash LIKE $1`, [`${TAG}%`]);
  await client.query(`DELETE FROM click_events WHERE ip_hash LIKE $1`, [`${TAG}%`]);

  if (process.argv.includes("--remove")) {
    await client.query("COMMIT");
    console.log("Removed the seeded events. Run the nightly job to refresh daily_stats.");
  } else {
    const velvet = await shopRow("velvet-salon");
    const iron = await shopRow("iron-house");
    const links = await linkIds(velvet.id);
    const ok = { reason: null };

    await scans(12, velvet.id, velvet.code, YESTERDAY, ok, "ok");
    await scans(3, velvet.id, velvet.code, `${YESTERDAY} + interval '2 hours'`, { reason: "crawler" }, "crawler");
    await scans(2, velvet.id, velvet.code, `${YESTERDAY} + interval '3 hours'`, { reason: "duplicate" }, "dup");
    await scans(4, velvet.id, velvet.code, `now() - interval '30 minutes'`, ok, "today");
    await taps(3, velvet.id, links.whatsapp, ok, "wa");
    await taps(1, velvet.id, links.call, ok, "call");
    await taps(1, velvet.id, links.google_review, ok, "g");
    await taps(1, velvet.id, links.whatsapp, { reason: "no_token" }, "notoken");

    await scans(20, iron.id, iron.code, YESTERDAY, ok, "iron");
    await scans(40, iron.id, iron.code, `${YESTERDAY} + interval '5 hours'`, { reason: "spike_review" }, "spike");

    await client.query("COMMIT");
    console.log("Added events. Now run the nightly job so daily_stats picks them up.");
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
