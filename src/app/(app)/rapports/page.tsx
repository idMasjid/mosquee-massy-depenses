import { requireSession } from "@/lib/rbac";
import { getBudgetOverview } from "@/lib/aggregations";
import { RecapView, type RecapRow } from "@/components/rapports/recap-view";

export default async function RapportsPage() {
  await requireSession();
  const overview = await getBudgetOverview();

  const rows: RecapRow[] = overview.map((line) => ({
    id: line.budgetLineId,
    projectName: line.projectName,
    rubrique: line.rubrique,
    productTitle: line.productTitle,
    budgetCents: line.budgetedAmountHTCents,
    realiseCents: line.realiseCents,
    engageCents: line.engageCents,
    restantCents: line.remainingCents,
  }));

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
