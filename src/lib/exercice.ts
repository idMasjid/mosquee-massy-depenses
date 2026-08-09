// Shared "exercice" (fiscal/calendar year) selection concept, used by both
// server-side aggregations and the client-side filter UI — kept dependency-free
// (no "server-only") so it can be imported from client components for types.

export type ExerciceSelection = number[] | "all";

export const CURRENT_EXERCICE_YEAR = new Date().getUTCFullYear();

// Same fallback as the historical monthly-spend logic: invoiceDate reflects
// when the purchase actually happened; entryDate is the fallback for expenses
// that don't have one yet (still engaged, not realised).
export function expenseExerciceYear(expense: { invoiceDate: Date | null; entryDate: Date }): number {
  return (expense.invoiceDate ?? expense.entryDate).getUTCFullYear();
}

export function exerciceSelectionMatches(selection: ExerciceSelection, year: number): boolean {
  return selection === "all" || selection.includes(year);
}

export function isDefaultExerciceSelection(selection: ExerciceSelection): boolean {
  return selection !== "all" && selection.length === 1 && selection[0] === CURRENT_EXERCICE_YEAR;
}

export function parseExerciceParam(raw: string | undefined): ExerciceSelection {
  if (!raw) return [CURRENT_EXERCICE_YEAR];
  if (raw === "all") return "all";
  const years = raw
    .split(",")
    .map((v) => Number.parseInt(v, 10))
    .filter((n) => Number.isInteger(n));
  return years.length ? years : [CURRENT_EXERCICE_YEAR];
}

export function serializeExerciceSelection(selection: ExerciceSelection): string {
  return selection === "all" ? "all" : selection.join(",");
}
