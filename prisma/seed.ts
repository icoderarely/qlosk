// Seeds the owner into admin_users. Run with `npm run db:seed` after migrating.
// Uses pg directly so it runs under plain Node without the generated client.
import { Client } from "pg";
import { normalizeEmail } from "../services/admin-users.ts";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file not present
  }
}

const databaseUrl = process.env.DATABASE_URL;
const ownerEmail = process.env.OWNER_EMAIL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
if (!ownerEmail) throw new Error("OWNER_EMAIL is not set.");

const email = normalizeEmail(ownerEmail);
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(
    `INSERT INTO admin_users (email, role) VALUES ($1, 'owner')
     ON CONFLICT (email) DO UPDATE SET role = 'owner'`,
    [email],
  );
  console.log(`Owner seeded: ${email}`);
} finally {
  await client.end();
}
