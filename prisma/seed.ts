// Creates (or resets) the owner account from ADMIN_USERNAME and ADMIN_PASSWORD.
// Run with `npm run db:seed` after migrating. Safe to run again: it updates the
// same account, so running it with a new password resets the owner's password.
// Delete ADMIN_PASSWORD from your env afterwards.
//
// Sign-up is closed in the app, so this writes the rows Better Auth would:
// a user, a credential account holding the scrypt hash, and the owner role.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Client } from "pg";
import { checkNewCredentials, normalizeUsername } from "../services/admin-accounts.ts";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file not present
  }
}

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const rawUsername = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
if (!databaseUrl) throw new Error("DIRECT_URL or DATABASE_URL is not set.");
if (!rawUsername) throw new Error("ADMIN_USERNAME is not set.");
if (!password) throw new Error("ADMIN_PASSWORD is not set.");

const problems = checkNewCredentials(rawUsername, password);
if (problems.length > 0) throw new Error(problems.join(" "));

const username = normalizeUsername(rawUsername);
const passwordHash = await hashPassword(password);

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM "user" WHERE username = $1`,
    [username],
  );
  let userId = existing.rows[0]?.id;
  if (!userId) {
    userId = randomUUID();
    await client.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", username, "displayUsername", "updatedAt")
       VALUES ($1, $2, $3, true, $4, $5, now())`,
      [userId, rawUsername.trim(), `${username}@admin.local`, username, rawUsername.trim()],
    );
  }

  const account = await client.query(
    `UPDATE account SET password = $2, "updatedAt" = now()
     WHERE "userId" = $1 AND "providerId" = 'credential'`,
    [userId, passwordHash],
  );
  if (account.rowCount === 0) {
    await client.query(
      `INSERT INTO account (id, "accountId", "providerId", "userId", password, "updatedAt")
       VALUES ($1, $2, 'credential', $2, $3, now())`,
      [randomUUID(), userId, passwordHash],
    );
  }

  await client.query(
    `INSERT INTO admin_roles (user_id, role) VALUES ($1, 'owner')
     ON CONFLICT (user_id) DO UPDATE SET role = 'owner'`,
    [userId],
  );

  await client.query("COMMIT");
  console.log(`Owner ready: ${username}. Delete ADMIN_PASSWORD from your env now.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
