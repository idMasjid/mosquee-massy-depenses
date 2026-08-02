export function parseFrenchDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseFrenchNumberToCents(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const cleaned = raw
    .replace(/[€\s ]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (cleaned === "" || cleaned === "-") return null;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

export function parseFrenchFloat(raw: string | null | undefined): number | null {
  const cents = parseFrenchNumberToCents(raw);
  return cents == null ? null : cents / 100;
}

export function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export function nonEmpty(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

// Google Sheets CSV exports can contain embedded newlines / stray leading spaces
// in header cells (wrapped text). Collapse to a single clean header string.
export function normalizeHeader(header: string): string {
  return header.replace(/\s+/g, " ").trim();
}

// Some sheet exports include a few fully-blank rows above the real header
// (title/spacer rows). Strip them so the header row csv-parse sees is correct.
export function stripLeadingBlankLines(content: string): string {
  const lines = content.split(/\r?\n/);
  let start = 0;
  while (start < lines.length && /^[,\s]*$/.test(lines[start])) {
    start++;
  }
  return lines.slice(start).join("\n");
}

// Merged cells in a Google Sheet export as a value only on the first row of the
// group and blank on subsequent rows. Carry the last non-empty value forward,
// but never propagate a "Total ..." rollup label as if it were real data.
export function forwardFill<T extends Record<string, string | undefined>>(rows: T[], keys: (keyof T)[]): T[] {
  const last = new Map<keyof T, string>();
  return rows.map((row) => {
    const filled = { ...row };
    for (const key of keys) {
      const value = nonEmpty(row[key]);
      if (value && !value.startsWith("Total ")) {
        last.set(key, value);
      } else if (!value) {
        const carried = last.get(key);
        if (carried) filled[key] = carried as T[keyof T];
      }
    }
    return filled;
  });
}
