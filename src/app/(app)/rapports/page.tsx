import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { getAvailableExerciceYears, getBudgetOverview } from "@/lib/aggregations";
import { parseExerciceParam } from "@/lib/exercice";
import { ExerciceFilter } from "@/components/exercice/exercice-filter";
import { RecapView, type RecapRow } from "@/components/rapports/recap-view";

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ exercices?: string }>;
}) {
  await requireSession();
  const { exercices } = await searchParams;
  const selection = parseExerciceParam(exercices);

  const [availableYears, overview, rapportsProjects, budgetLineRapportsOrders] = await Promise.all([
    getAvailableExerciceYears(),
    getBudgetOverview(selection),
    prisma.project.findMany({ orderBy: [{ rapportsOrder: "asc" }, { name: "asc" }], select: { id: true } }),
    prisma.budgetLine.findMany({ select: { id: true, rapportsOrder: true } }),
  ]);
  // Independent from the Projets page's own order — reordering here only
  // moves things on this Récapitulatif page.
  const projectRank = new Map(rapportsProjects.map((p, i) => [p.id, i]));
  const lineRank = new Map(budgetLineRapportsOrders.map((l) => [l.id, l.rapportsOrder]));

  const rows: RecapRow[] = overview
    .map((line) => ({
      id: line.budgetLineId,
      projectId: line.projectId,
      projectName: line.projectName,
      rubrique: line.rubrique,
      productTitle: line.productTitle,
      budgetCents: line.budgetedAmountHTCents,
      realiseCents: line.realiseCents,
      engageCents: line.engageCents,
      restantCents: line.remainingCents,
    }))
    .sort((a, b) => {
      const projectDiff = (projectRank.get(a.projectId) ?? 0) - (projectRank.get(b.projectId) ?? 0);
      if (projectDiff !== 0) return projectDiff;
      return (lineRank.get(a.id) ?? 0) - (lineRank.get(b.id) ?? 0);
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Récapitulatif des dépenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue consolidée par projet — budget, réalisé, engagé et restant.
          </p>
        </div>
        <ExerciceFilter availableYears={availableYears} selection={selection} />
      </div>
      <RecapView rows={rows} />
    </div>
  );
}
