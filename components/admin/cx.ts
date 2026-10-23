// Tailwind does not de-duplicate conflicting utilities, and which one wins
// depends on stylesheet order. A component lists its default utilities with
// the pattern that overrides each; a caller's className replaces the default
// instead of fighting it.
export type Default = [overriddenBy: RegExp, utility: string];

export function withDefaults(defaults: Default[], extra = ""): string {
  const kept = defaults.filter(([pattern]) => !pattern.test(extra)).map(([, u]) => u);
  return [...kept, extra].filter(Boolean).join(" ");
}
