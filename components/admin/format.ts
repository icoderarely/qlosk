const NUMBER = new Intl.NumberFormat("en-IN");

export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

/** Scan counts: null means the page has no scans yet. */
export function formatScans(n: number | null): string {
  return n === null ? "None yet" : formatNumber(n);
}

export function formatCode(code: string | null): string {
  return code ?? "Not assigned";
}
