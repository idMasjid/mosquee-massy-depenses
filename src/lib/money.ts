export function toCents(euros: number): number {
  return Math.round(euros * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

const EUR_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatEUR(cents: number | null | undefined): string {
  return EUR_FORMATTER.format(fromCents(cents ?? 0));
}

// Parses French-formatted numbers like "1 234,56 €" or "1.234,56" into cents.
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
