"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DivergingBarList, type DivergingBarDatum } from "@/components/dashboard/diverging-bar-list";
import { reorderProjectsDashboard } from "@/lib/actions/project-actions";

type SortMode = "manual" | "asc" | "desc";

export function SortableProjectBudgetPanel({ data }: { data: DivergingBarDatum[] }) {
  const [items, setItems] = useState(data);
  const [prevData, setPrevData] = useState(data);
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [, startTransition] = useTransition();

  if (data !== prevData) {
    setPrevData(data);
    setItems(data);
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={cycleSortMode} className="gap-1.5">
          {sortMode === "manual" && <ArrowUpDown className="size-3.5" />}
          {sortMode === "asc" && <ArrowUp className="size-3.5" />}
          {sortMode === "desc" && <ArrowDown className="size-3.5" />}
          Dépassement
          {sortMode === "asc" && " (croissant)"}
          {sortMode === "desc" && " (décroissant)"}
        </Button>
        {sortMode !== "manual" && (
          <span className="text-xs text-muted-foreground">Glisser-déposer désactivé pendant le tri</span>
        )}
      </div>
      <DivergingBarList data={displayed} onReorder={sortMode === "manual" ? handleReorder : undefined} />
    </div>
  );
}
