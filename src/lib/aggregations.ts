import "server-only";
import { prisma } from "@/lib/prisma";
import { ENGAGED_STATUSES, type ExpenseStatus } from "@/lib/constants";

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

export async function getBudgetOverview(): Promise<BudgetLineTotal[]> {
  const [budgetLines, expenses] = await Promise.all([
    prisma.budgetLine.findMany({
      include: { project: true },
      orderBy: [{ project: { order: "asc" } }, { order: "asc" }, { rubrique: "asc" }],
    }),
    prisma.expense.findMany({
      where: { budgetLineId: { not: null } },
      select: { budgetLineId: true, status: true, totalTTCCents: true },
    }),
  ]);

  const totals = new Map<string, { realise: number; engage: number }>();
  for (const expense of expenses) {
    if (!expense.budgetLineId) continue;
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

export async function getMonthlySpend(): Promise<MonthlySpendEntry[]> {
  const expenses = await prisma.expense.findMany({
    where: { status: "REALISE" },
    select: { realizedAt: true, entryDate: true, totalTTCCents: true },
  });

  const buckets = new Map<string, number>();
  for (const expense of expenses) {
    const date = expense.realizedAt ?? expense.entryDate;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
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
};

export async function getForecastSummary(): Promise<ForecastSummary> {
  const [overview, monthly] = await Promise.all([getBudgetOverview(), getMonthlySpend()]);

  const totalBudgetCents = overview.reduce((sum, l) => sum + l.budgetedAmountHTCents, 0);
  const totalRealiseCents = overview.reduce((sum, l) => sum + l.realiseCents, 0);
  const totalEngageCents = overview.reduce((sum, l) => sum + l.engageCents, 0);
  const totalRemainingCents = totalBudgetCents - totalRealiseCents - totalEngageCents;

  const lastThreeMonths = monthly.slice(-3);
  const monthlyRunRateCents = lastThreeMonths.length
    ? Math.round(lastThreeMonths.reduce((sum, m) => sum + m.realiseCents, 0) / lastThreeMonths.length)
    : 0;

  const now = new Date();
  const monthsRemainingInYear = 12 - now.getUTCMonth() - 1;
  const projectedYearEndCents =
    totalRealiseCents + totalEngageCents + monthlyRunRateCents * Math.max(monthsRemainingInYear, 0);

  return {
    totalBudgetCents,
    totalRealiseCents,
    totalEngageCents,
    totalRemainingCents,
    monthlyRunRateCents,
    projectedYearEndCents,
  };
}
