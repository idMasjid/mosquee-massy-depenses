"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DivergingBarList, type DivergingBarDatum } from "@/components/dashboard/diverging-bar-list";
import { RubriqueBreakdownPanel, type ProjectRubriqueBudgetDatum } from "@/components/dashboard/rubrique-breakdown-panel";
import { reorderProjectsDashboard } from "@/lib/actions/project-actions";

type SortMode = "manual" | "asc" | "desc";

// Single source of truth for the project order shared by "Budget par projet"
// and "Budget par catégorie" — both panels render from the same state here,
// so a drag or a sort-mode change in either is reflected in both instantly,
// without waiting on a server round-trip / page refresh.
export function DashboardProjectPanels({
  projectBudgets,
  rubriqueData,
}: {
  projectBudgets: DivergingBarDatum[];
  rubriqueData: ProjectRubriqueBudgetDatum[];
}) {
  const [items, setItems] = useState(projectBudgets);
  const [prevData, setPrevData] = useState(projectBudgets);
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [, startTransition] = useTransition();

  if (projectBudgets !== prevData) {
    setPrevData(projectBudgets);
    setItems(projectBudgets);
  }

  function handleReorder(orderedIds: string[]) {
    const previous = items;
    const reordered = orderedIds.map((id) => items.find((d) => d.id === id)!);
    setItems(reordered);
    startTransition(async () => {
      const result = await reorderProjectsDashboard(orderedIds);
      if (!result.success) {
        toast.error(result.error);
        setItems(previous);
      }
    });
  }

  function cycleSortMode() {
    setSortMode((prev) => (prev === "manual" ? "asc" : prev === "asc" ? "desc" : "manual"));
  }

  const displayed =
    sortMode === "manual"
      ? items
      : [...items].sort((a, b) => (sortMode === "asc" ? a.restant - b.restant : b.restant - a.restant));

  const canDrag = sortMode === "manual";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Budget par projet</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          % et montant affichés = restant par rapport au budget alloué (survoler la barre pour le détail)
        </p>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={cycleSortMode} className="gap-1.5">
            {sortMode === "manual" && <ArrowUpDown className="size-3.5" />}
            {sortMode === "asc" && <ArrowUp className="size-3.5" />}
            {sortMode === "desc" && <ArrowDown className="size-3.5" />}
            Dépassement
            {sortMode === "asc" && " (croissant)"}
            {sortMode === "desc" && " (décroissant)"}
          </Button>
          {!canDrag && <span className="text-xs text-muted-foreground">Glisser-déposer désactivé pendant le tri</span>}
        </div>
        <DivergingBarList data={displayed} onReorder={canDrag ? handleReorder : undefined} />
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Budget par catégorie</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          % et montant = restant par catégorie — filtrable par projet, groupé par projet si plusieurs sont sélectionnés
        </p>
        <RubriqueBreakdownPanel
          data={rubriqueData}
          projects={displayed.map((d) => ({ id: d.id, name: d.label }))}
          onReorderProjects={canDrag ? handleReorder : undefined}
        />
      </div>
    </div>
  );
}
