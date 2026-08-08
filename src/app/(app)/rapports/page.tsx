import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { getBudgetOverview } from "@/lib/aggregations";
import { RecapView, type RecapRow } from "@/components/rapports/recap-view";

export default async function RapportsPage() {
  await requireSession();
  const [overview, rapportsProjects, budgetLineRapportsOrders] = await Promise.all([
    getBudgetOverview(),
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
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Récapitulatif des dépenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue consolidée par projet — budget, réalisé, engagé et restant.
        </p>
      </div>
      <RecapView rows={rows} />
    </div>
  );
}
