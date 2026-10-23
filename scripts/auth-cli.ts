// Only for the Better Auth CLI, which wants an exported `auth`:
//   npx auth@latest generate --config scripts/auth-cli.ts --output prisma/schema.prisma -y
// Needs DATABASE_URL set to anything; the CLI never connects.
import { getAuth } from "../lib/auth";

export const auth = getAuth();
