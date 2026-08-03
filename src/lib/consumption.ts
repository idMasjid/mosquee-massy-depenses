export function consumptionPct(budgetCents: number, spentCents: number, restantCents: number) {
  if (budgetCents > 0) return Math.round((restantCents / budgetCents) * 100);
  return spentCents > 0 ? -100 : 0;
}
