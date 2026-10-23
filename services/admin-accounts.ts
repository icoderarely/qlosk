// Rules for creating an admin account. No Next.js imports.

// Better Auth lowercases usernames and, by default, allows letters, digits,
// underscores and dots, 3 to 30 characters.
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

// Returns a list of problems; empty means the credentials are acceptable.
export function checkNewCredentials(username: string, password: string): string[] {
  const problems: string[] = [];
  const name = normalizeUsername(username);
  if (name.length < 3 || name.length > 30) {
    problems.push("Username must be 3 to 30 characters.");
  }
  if (!/^[a-z0-9_.]*$/.test(name)) {
    problems.push("Username may use letters, digits, underscore and dot only.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    problems.push(`Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
  }
  return problems;
}
