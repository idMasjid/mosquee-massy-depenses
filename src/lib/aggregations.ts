import "server-only";
import { prisma } from "@/lib/prisma";
import { ENGAGED_STATUSES, type ExpenseStatus } from "@/lib/constants";
import {
  CURRENT_EXERCICE_YEAR,
  expenseExerciceYear,
  exerciceSelectionMatches,
  isDefaultExerciceSelection,
  type ExerciceSelection,
} from "@/lib/exercice";

const DEFAULT_SELECTION: ExerciceSelection = [CURRENT_EXERCICE_YEAR];

export async function getAvailableExerciceYears(): Promise<number[]> {
  const expenses = await prisma.expense.findMany({ select: { invoiceDate: true, entryDate: true } });
  const years = new Set<number>([CURRENT_EXERCICE_YEAR]);
  for (const expense of expenses) years.add(expenseExerciceYear(expense));
  return [...years].sort((a, b) => b - a);
}

export type BudgetLineTotal = {
  budgetLineId: string;
  projectId: string;
  projectName: string;
  rubrique: string;
  productTitle: string | null;
  budgetedAmountHTCents: number;
  realiseCents: number;
  engageCents: number;
  remainingCents: number;
  isActive: boolean;
};

export async function getBudgetOverview(selection: ExerciceSelection = DEFAULT_SELECTION): Promise<BudgetLineTotal[]> {
  const [budgetLines, expenses] = await Promise.all([
    prisma.budgetLine.findMany({
      include: { project: true },
      orderBy: [{ project: { order: "asc" } }, { order: "asc" }, { rubrique: "asc" }],
    }),
    prisma.expense.findMany({
      where: { budgetLineId: { not: null } },
      select: { budgetLineId: true, status: true, totalTTCCents: true, invoiceDate: true, entryDate: true },
    }),
  ]);

  const totals = new Map<string, { realise: number; engage: number }>();
  for (const expense of expenses) {
    if (!expense.budgetLineId) continue;
    if (!exerciceSelectionMatches(selection, expenseExerciceYear(expense))) continue;
    const bucket = totals.get(expense.budgetLineId) ?? { realise: 0, engage: 0 };
    if (expense.status === "REALISE") {
      bucket.realise += expense.totalTTCCents;
    } else if (ENGAGED_STATUSES.includes(expense.status as ExpenseStatus)) {
      bucket.engage += expense.totalTTCCents;
    }
    totals.set(expense.budgetLineId, bucket);
  }

  return budgetLines.map((line) => {
    const t = totals.get(line.id) ?? { realise: 0, engage: 0 };
    return {
      budgetLineId: line.id,
      projectId: line.projectId,
      projectName: line.project.name,
      rubrique: line.rubrique,
      productTitle: line.productTitle,
      budgetedAmountHTCents: line.budgetedAmountHTCents,
      realiseCents: t.realise,
      engageCents: t.engage,
      remainingCents: line.budgetedAmountHTCents - t.realise - t.engage,
      isActive: line.isActive,
    };
  });
}

export type MonthlySpendEntry = { month: string; realiseCents: number };

export async function getMonthlySpend(selection: ExerciceSelection = DEFAULT_SELECTION): Promise<MonthlySpendEntry[]> {
  const expenses = await prisma.expense.findMany({
    where: { status: "REALISE" },
    select: { invoiceDate: true, entryDate: true, totalTTCCents: true },
  });

  const buckets = new Map<string, number>();
  for (const expense of expenses) {
    // The invoice date reflects when the purchase actually happened; entryDate
    // (when it was recorded) is only a fallback since data entry often lags
    // behind — realizedAt (workflow status date) has the same lag problem.
    const date = expense.invoiceDate ?? expense.entryDate;
    const year = date.getUTCFullYear();
    if (!exerciceSelectionMatches(selection, year)) continue;
    const key = `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + expense.totalTTCCents);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, realiseCents]) => ({ month, realiseCents }));
}

export type ForecastSummary = {
  totalBudgetCents: number;
  totalRealiseCents: number;
  totalEngageCents: number;
  totalRemainingCents: number;
  monthlyRunRateCents: number;
  projectedYearEndCents: number;
  // The "fin d'exercice" projection only makes sense when looking at the
  // current, still-running exercice — a past year is closed, a multi-year or
  // "all" selection isn't a single year to project the end of.
  projectionAvailable: boolean;
};

export async function getForecastSummary(selection: ExerciceSelection = DEFAULT_SELECTION): Promise<ForecastSummary> {
  const [overview, monthly] = await Promise.all([getBudgetOverview(selection), getMonthlySpend(selection)]);

  const totalBudgetCents = overview.reduce((sum, l) => sum + l.budgetedAmountHTCents, 0);
  const totalRealiseCents = overview.reduce((sum, l) => sum + l.realiseCents, 0);
  const totalEngageCents = overview.reduce((sum, l) => sum + l.engageCents, 0);
  const totalRemainingCents = totalBudgetCents - totalRealiseCents - totalEngageCents;

  const projectionAvailable = isDefaultExerciceSelection(selection);

  const lastThreeMonths = monthly.slice(-3);
  const monthlyRunRateCents = lastThreeMonths.length
    ? Math.round(lastThreeMonths.reduce((sum, m) => sum + m.realiseCents, 0) / lastThreeMonths.length)
    : 0;

  const now = new Date();
  const monthsRemainingInYear = 12 - now.getUTCMonth() - 1;
  const projectedYearEndCents = projectionAvailable
    ? totalRealiseCents + totalEngageCents + monthlyRunRateCents * Math.max(monthsRemainingInYear, 0)
    : totalRealiseCents + totalEngageCents;

  return {
    totalBudgetCents,
    totalRealiseCents,
    totalEngageCents,
    totalRemainingCents,
    monthlyRunRateCents,
    projectedYearEndCents,
    projectionAvailable,
  };
}
